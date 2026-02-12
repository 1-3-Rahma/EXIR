import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

const DoctorMessages = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [alerts, setAlerts] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyLocation, setEmergencyLocation] = useState('');
  const [emergencyDetails, setEmergencyDetails] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const contactsPollRef = useRef(null);
  const fallbackPollRef = useRef(null);
  const currentChatIdRef = useRef(null);
  const contactsRef = useRef([]);
  const currentUserId = user?._id?.toString?.() || user?.id?.toString?.() || '';

  const normalizeMsg = (msg, isOwn = false) => ({
    id: String(msg.id ?? msg._id ?? ''),
    senderId: msg.senderId,
    text: msg.content || msg.text || '',
    time: new Date(msg.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    isOwn,
    read: !!msg.read
  });

  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    fetchContacts();
    fetchAlerts();

    if (contactsPollRef.current) clearInterval(contactsPollRef.current);
    contactsPollRef.current = setInterval(() => fetchContacts(), 15000);

    const handleStatusChange = (e) => {
      const { userId, status } = e.detail;
      setContacts(prev => prev.map(c =>
        (String(c._id) === String(userId) || String(c.id) === String(userId)) ? { ...c, status } : c
      ));
    };

    const handleNewChatMessage = (e) => {
      const { chatId, message: msg } = e.detail || {};
      if (!msg?.content) return;
      const chatIdStr = String(chatId);
      const isCurrentChat = chatIdStr === String(currentChatIdRef.current);
      const senderIdStr = msg.senderId?.toString?.() || msg.senderId;
      const transformed = normalizeMsg(msg, senderIdStr === currentUserId);

      if (isCurrentChat) {
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(transformed.id))) return prev;
          return [...prev, transformed];
        });
      } else {
        currentChatIdRef.current = chatIdStr;
        setCurrentChatId(chatIdStr);
        const contact = contactsRef.current.find(
          c => String(c._id) === String(msg.senderId) || String(c.id) === String(msg.senderId)
        );
        if (contact) setSelectedContact(contact);
        fetchContacts(true);
      }
    };

    const handleChatMessagesRead = (e) => {
      if (String(e.detail?.chatId) !== String(currentChatIdRef.current)) return;
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
    };

    const handleSocketReconnect = () => {
      const cid = currentChatIdRef.current;
      if (cid) fetchMessagesForChat(cid, false);
    };

    window.addEventListener('userStatusChanged', handleStatusChange);
    window.addEventListener('newChatMessage', handleNewChatMessage);
    window.addEventListener('chatMessagesRead', handleChatMessagesRead);
    window.addEventListener('socketConnected', handleSocketReconnect);

    return () => {
      if (contactsPollRef.current) clearInterval(contactsPollRef.current);
      window.removeEventListener('userStatusChanged', handleStatusChange);
      window.removeEventListener('newChatMessage', handleNewChatMessage);
      window.removeEventListener('chatMessagesRead', handleChatMessagesRead);
      window.removeEventListener('socketConnected', handleSocketReconnect);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (selectedContact) {
      const contactId = selectedContact._id || selectedContact.id;
      fetchChatWithUser(contactId);
    }
  }, [selectedContact]);

  // Fallback poll when socket is disconnected (so messages still appear)
  useEffect(() => {
    if (fallbackPollRef.current) clearInterval(fallbackPollRef.current);
    const cid = currentChatIdRef.current;
    if (!cid) return;
    const sock = getSocket();
    if (sock?.connected) return;
    fallbackPollRef.current = setInterval(() => {
      if (getSocket()?.connected) {
        if (fallbackPollRef.current) clearInterval(fallbackPollRef.current);
        return;
      }
      fetchMessagesForChat(cid, false);
    }, 8000);
    return () => {
      if (fallbackPollRef.current) clearInterval(fallbackPollRef.current);
    };
  }, [currentChatId]);

  // Keep selectedContact status in sync with contacts list
  useEffect(() => {
    if (selectedContact) {
      const updated = contacts.find(c => (c._id || c.id) === (selectedContact._id || selectedContact.id));
      if (updated && updated.status !== selectedContact.status) {
        setSelectedContact(prev => ({ ...prev, status: updated.status }));
      }
    }
  }, [contacts]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoadingContacts(true);
      const resp = await api.get('/chat/contacts');
      const data = resp.data;
      const rawList = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const currentUserId = user?._id?.toString?.() || user?.id?.toString?.();
      const transformedContacts = rawList
        .filter(c => (c._id?.toString?.() || c.id?.toString?.()) !== currentUserId)
        .map(contact => ({
          ...contact,
          _id: contact._id || contact.id,
          id: contact._id || contact.id,
          name: contact.name || contact.fullName || 'Unknown',
          fullName: contact.fullName || contact.name,
          avatar: (contact.avatar || (contact.fullName || contact.name || '?').charAt(0)).toUpperCase(),
          role: contact.roleLabel || (contact.role ? contact.role.charAt(0).toUpperCase() + contact.role.slice(1) : 'Staff'),
          status: contact.status || (contact.isLoggedIn ? 'online' : 'offline'),
          category: contact.category || (contact.role === 'doctor' ? 'doctors' : contact.role === 'nurse' ? 'nurses' : 'other'),
          unread: contact.unread ?? 0,
          phone: contact.phone || null
        }));
      setContacts(transformedContacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      setContacts([]);
    } finally {
      if (!skipLoading) setLoadingContacts(false);
    }
  };

  const fetchChatWithUser = async (userId) => {
    const id = userId?.toString?.();
    if (!id) return;
    try {
      setLoadingMessages(true);
      const resp = await api.get(`/chat/with/${id}`);
      const chat = resp.data?.data || resp.data;
      const chatId = chat?._id ?? chat?.chatId;
      setCurrentChatId(chatId);
      currentChatIdRef.current = chatId;

      const myId = user?._id?.toString?.() || user?.id?.toString?.() || '';
      const transformedMessages = (chat.messages || []).map(msg =>
        normalizeMsg(
          { ...msg, id: msg.id ?? msg._id, content: msg.content },
          (msg.senderId?.toString?.() || msg.senderId) === myId
        )
      );
      setMessages(transformedMessages);

      if (chatId) {
        api.patch(`/chat/${chatId}/read`).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to fetch chat:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchMessagesForChat = async (chatId, showLoading = true) => {
    const cid = chatId?.toString?.();
    if (!cid) return;
    try {
      if (showLoading) setLoadingMessages(true);
      const resp = await api.get(`/chat/${cid}/messages`);
      const data = resp.data;
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const myId = user?._id?.toString?.() || user?.id?.toString?.() || '';
      const transformedMessages = list.map(msg => {
        const senderIdStr = msg.senderId?.toString?.() || msg.senderId?._id?.toString?.() || '';
        return normalizeMsg(
          { ...msg, id: msg.id ?? msg._id, content: msg.content },
          senderIdStr === myId
        );
      });
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  };

  const fetchAlerts = async () => {
    setAlerts([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || sendingMessage) return;

    const messageText = newMessage;
    setNewMessage('');

    const optimisticId = String(Date.now());
    const optimisticMessage = {
      id: optimisticId,
      senderId: user?._id,
      text: messageText,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      read: false
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      setSendingMessage(true);
      const contactId = selectedContact._id || selectedContact.id;
      const resp = await api.post(`/chat/send/${contactId}`, { content: messageText });
      const data = resp.data;
      const serverChatId = data.data?.chatId || data.chatId;
      const serverMessage = data.message || data.data?.message;

      if (serverChatId) {
        setCurrentChatId(serverChatId);
        currentChatIdRef.current = String(serverChatId);
      }

      if (serverMessage?.id != null) {
        const realId = String(serverMessage.id);
        const timeStr = serverMessage.time || new Date(serverMessage.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => prev.map(m =>
          String(m.id) === optimisticId ? { ...m, id: realId, time: timeStr } : m
        ));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => String(m.id) !== optimisticId));
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEmergencyRequest = async (e) => {
    e.preventDefault();
    alert(`Emergency Alert Sent!\nType: ${emergencyType}\nLocation: ${emergencyLocation}\nDetails: ${emergencyDetails}`);
    setShowEmergencyModal(false);
    setEmergencyType('');
    setEmergencyLocation('');
    setEmergencyDetails('');
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || contact.category === filterCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    const aOnline = a.status === 'online' ? 1 : 0;
    const bOnline = b.status === 'online' ? 1 : 0;
    if (bOnline !== aOnline) return bOnline - aOnline;
    return (a.name || '').localeCompare(b.name || '');
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'busy': return '#f59e0b';
      case 'offline': return '#9ca3af';
      default: return '#9ca3af';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'urgent': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'urgent': return '#fee2e2';
      case 'warning': return '#fef3c7';
      case 'info': return '#e0f2fe';
      default: return '#f3f4f6';
    }
  };

  const styles = {
    container: { padding: '24px', backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' },
    header: { marginBottom: '16px' },
    title: { fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: 0 },
    subtitle: { color: '#64748b', margin: '4px 0 0 0' },
    mainGrid: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', height: 'calc(100vh - 160px)' },
    contactsPanel: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    contactsHeader: { padding: '20px', borderBottom: '1px solid #e2e8f0' },
    searchInput: { width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', marginBottom: '12px', outline: 'none' },
    filterTabs: { display: 'flex', gap: '8px' },
    filterTab: { padding: '8px 12px', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
    contactsList: { flex: 1, overflowY: 'auto', padding: '12px' },
    contactItem: { display: 'flex', alignItems: 'center', padding: '12px', borderRadius: '12px', cursor: 'pointer', marginBottom: '4px', transition: 'all 0.2s' },
    contactAvatar: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '14px', marginRight: '12px', position: 'relative' },
    statusDot: { position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white' },
    contactInfo: { flex: 1 },
    contactName: { fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '2px' },
    contactRole: { color: '#64748b', fontSize: '12px' },
    unreadBadge: { backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600' },
    chatPanel: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
    chatHeader: { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    chatHeaderInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
    chatActions: { display: 'flex', gap: '8px' },
    actionBtn: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' },
    chatMessages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    emptyChat: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' },
    messageRow: { display: 'flex', justifyContent: 'flex-start' },
    messageRowOwn: { display: 'flex', justifyContent: 'flex-end' },
    messageBubble: { maxWidth: '70%', padding: '12px 16px', borderRadius: '16px', fontSize: '14px', lineHeight: '1.5' },
    messageTime: { fontSize: '11px', marginTop: '4px' },
    chatInputArea: { padding: '16px 20px', borderTop: '1px solid #e2e8f0' },
    chatForm: { display: 'flex', gap: '12px' },
    messageInput: { flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '24px', fontSize: '14px', outline: 'none' },
    sendBtn: { padding: '12px 24px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '24px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
    rightPanel: { display: 'flex', flexDirection: 'column', gap: '16px' },
    quickActions: { backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px' },
    sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' },
    quickActionBtns: { display: 'flex', flexDirection: 'column', gap: '8px' },
    quickActionBtn: { padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' },
    emergencyBtn: { padding: '14px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px', transition: 'all 0.2s' },
    alertsSection: { flex: 1, backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
    alertsList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
    alertItem: { padding: '12px', borderRadius: '10px', display: 'flex', gap: '10px' },
    alertContent: { flex: 1 },
    alertTitle: { fontSize: '13px', fontWeight: '500', color: '#1e293b', marginBottom: '2px' },
    alertTime: { fontSize: '11px', color: '#64748b' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    modalTitle: { fontSize: '20px', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151', fontSize: '14px' },
    select: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none' },
    input: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box' },
    submitEmergencyBtn: { width: '100%', padding: '14px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  };

  return (
    <Layout appName="EXIR" role="doctor">
      <div style={styles.header}>
        <h1 style={styles.title}>Messages & Communication</h1>
        <p style={styles.subtitle}>Message nurses and colleagues</p>
      </div>

      <div className="chat-main-grid" style={styles.mainGrid}>
        <div className="chat-contacts-panel" style={styles.contactsPanel}>
          <div style={styles.contactsHeader}>
            <input
              type="text"
              placeholder="Search contacts..."
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div style={styles.filterTabs}>
              {[
                { key: 'all', label: 'All' },
                { key: 'doctors', label: 'Doctors' },
                { key: 'nurses', label: 'Nurses' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  style={{
                    ...styles.filterTab,
                    backgroundColor: filterCategory === tab.key ? '#0ea5e9' : '#f1f5f9',
                    color: filterCategory === tab.key ? 'white' : '#64748b',
                  }}
                  onClick={() => setFilterCategory(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.contactsList}>
            {loadingContacts ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading contacts...</div>
            ) : filteredContacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No contacts available</div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    ...styles.contactItem,
                    backgroundColor: selectedContact?.id === contact.id ? '#e0f2fe' : 'transparent',
                  }}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div style={styles.contactAvatar}>
                    {contact.avatar}
                    <div style={{ ...styles.statusDot, backgroundColor: getStatusColor(contact.status) }} />
                  </div>
                  <div style={styles.contactInfo}>
                    <div style={styles.contactName}>{contact.name}</div>
                    <div style={styles.contactRole}>{contact.role}</div>
                  </div>
                  {contact.unread > 0 && <div style={styles.unreadBadge}>{contact.unread}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-panel" style={styles.chatPanel}>
          {selectedContact ? (
            <>
              <div style={styles.chatHeader}>
                <div style={styles.chatHeaderInfo}>
                  <div style={{ ...styles.contactAvatar, marginRight: 0 }}>
                    {selectedContact.avatar}
                    <div style={{ ...styles.statusDot, backgroundColor: getStatusColor(selectedContact.status) }} />
                  </div>
                  <div>
                    <div style={styles.contactName}>{selectedContact.name}</div>
                    <div style={styles.contactRole}>{selectedContact.role} - {selectedContact.status}</div>
                  </div>
                </div>
                {/* <div style={styles.chatActions}>
                  {selectedContact.phone ? (
                    <a href={`tel:${selectedContact.phone}`} style={{ ...styles.actionBtn, textDecoration: 'none', color: 'inherit' }}>📞 Call</a>
                  ) : (
                    <button style={styles.actionBtn} title="No phone number on file">📞 Call</button>
                  )}
                  <button style={styles.actionBtn} title="Video call (coming soon)">📹 Video</button>
                </div> */}
              </div>
              <div style={styles.chatMessages}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
                    <div>No messages yet. Start the conversation!</div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} style={message.isOwn ? styles.messageRowOwn : styles.messageRow}>
                      <div
                        style={{
                          ...styles.messageBubble,
                          backgroundColor: message.isOwn ? '#0ea5e9' : '#f1f5f9',
                          color: message.isOwn ? 'white' : '#1e293b',
                          borderBottomRightRadius: message.isOwn ? '4px' : '16px',
                          borderBottomLeftRadius: message.isOwn ? '16px' : '4px',
                        }}
                      >
                        <div>{message.text}</div>
                        <div style={{ ...styles.messageTime, color: message.isOwn ? 'rgba(255,255,255,0.7)' : '#94a3b8', textAlign: message.isOwn ? 'right' : 'left' }}>
                          {message.time}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={styles.chatInputArea}>
                <form style={styles.chatForm} onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    style={styles.messageInput}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <button
                    type="submit"
                    style={{ ...styles.sendBtn, opacity: sendingMessage ? 0.7 : 1, cursor: sendingMessage ? 'not-allowed' : 'pointer' }}
                    disabled={sendingMessage}
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={styles.emptyChat}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
              <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>Select a conversation</div>
              <div style={{ fontSize: '14px' }}>Choose a nurse or colleague to message</div>
            </div>
          )}
        </div>

        {/* <div style={styles.rightPanel}>
          <div style={styles.quickActions}>
            <h3 style={styles.sectionTitle}>Quick Actions</h3>
            <div style={styles.quickActionBtns}>
              <button style={styles.quickActionBtn}><span>👥</span> Group Chat</button>
              <button style={styles.quickActionBtn}><span>📋</span> Call Directory</button>
              <button style={styles.quickActionBtn}><span>📢</span> Broadcast Message</button>
              <button style={styles.emergencyBtn} onClick={() => setShowEmergencyModal(true)}>
                <span>🚨</span> Emergency Request
              </button>
            </div>
          </div>
          <div style={styles.alertsSection}>
            <h3 style={styles.sectionTitle}>Recent Updates & Alerts</h3>
            <div style={styles.alertsList}>
              {alerts.map((alert) => (
                <div key={alert.id} style={{ ...styles.alertItem, backgroundColor: getAlertColor(alert.type), opacity: alert.read ? 0.7 : 1 }}>
                  <span style={{ fontSize: '18px' }}>{getAlertIcon(alert.type)}</span>
                  <div style={styles.alertContent}>
                    <div style={styles.alertTitle}>{alert.title}</div>
                    <div style={styles.alertTime}>{alert.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div> */}
      </div>

      {showEmergencyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEmergencyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}><span>🚨</span> Emergency Request</h2>
              <button style={styles.closeBtn} onClick={() => setShowEmergencyModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEmergencyRequest}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Emergency Type *</label>
                <select style={styles.select} value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)} required>
                  <option value="">Select type</option>
                  <option value="code_blue">Code Blue - Cardiac Arrest</option>
                  <option value="code_red">Code Red - Fire</option>
                  <option value="code_pink">Code Pink - Infant Abduction</option>
                  <option value="code_orange">Code Orange - Hazmat</option>
                  <option value="rapid_response">Rapid Response Team</option>
                  <option value="security">Security Assistance</option>
                  <option value="other">Other Emergency</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Location *</label>
                <input type="text" style={styles.input} placeholder="e.g., Room 305, ICU Ward" value={emergencyLocation} onChange={(e) => setEmergencyLocation(e.target.value)} required />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Details</label>
                <textarea style={styles.textarea} placeholder="Provide any additional details..." value={emergencyDetails} onChange={(e) => setEmergencyDetails(e.target.value)} />
              </div>
              <button type="submit" style={styles.submitEmergencyBtn}>Send Emergency Alert</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .chat-main-grid {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
          .chat-contacts-panel {
            max-height: 300px;
          }
          .chat-panel {
            height: calc(100vh - 380px);
            min-height: 400px;
          }
        }
        @media (max-width: 600px) {
          .chat-contacts-panel {
            max-height: 250px;
          }
          .chat-panel {
            height: calc(100vh - 340px);
            min-height: 350px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default DoctorMessages;
