import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const NurseMessages = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [alerts, setAlerts] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyLocation, setEmergencyLocation] = useState('');
  const [emergencyDetails, setEmergencyDetails] = useState('');
  const messagesEndRef = useRef(null);

  // Mock contacts data
  const mockContacts = [
    { id: 1, name: 'Dr. Ahmed Hassan', role: 'Cardiologist', category: 'doctors', status: 'online', avatar: 'AH', unread: 2 },
    { id: 2, name: 'Dr. Sarah Mohamed', role: 'Neurologist', category: 'doctors', status: 'online', avatar: 'SM', unread: 0 },
    { id: 3, name: 'Dr. Omar Khalil', role: 'General Physician', category: 'doctors', status: 'offline', avatar: 'OK', unread: 0 },
    { id: 4, name: 'Nurse Fatima Ali', role: 'ICU Nurse', category: 'nurses', status: 'online', avatar: 'FA', unread: 1 },
    { id: 5, name: 'Nurse Youssef Nabil', role: 'Ward Nurse', category: 'nurses', status: 'busy', avatar: 'YN', unread: 0 },
    { id: 6, name: 'Emergency Department', role: 'Department', category: 'departments', status: 'online', avatar: 'ED', unread: 0 },
    { id: 7, name: 'Radiology', role: 'Department', category: 'departments', status: 'online', avatar: 'RD', unread: 3 },
    { id: 8, name: 'Laboratory', role: 'Department', category: 'departments', status: 'online', avatar: 'LB', unread: 0 },
    { id: 9, name: 'Pharmacy', role: 'Department', category: 'departments', status: 'online', avatar: 'PH', unread: 1 },
  ];

  // Mock messages for selected contact
  const mockMessages = {
    1: [
      { id: 1, senderId: 1, text: 'Good morning, how is patient Ahmed doing?', time: '09:15 AM', isOwn: false },
      { id: 2, senderId: 'me', text: 'Good morning Dr. Hassan. Vitals are stable, BP is 120/80', time: '09:17 AM', isOwn: true },
      { id: 3, senderId: 1, text: 'Excellent. Please continue monitoring and update me if anything changes', time: '09:18 AM', isOwn: false },
      { id: 4, senderId: 'me', text: 'Will do. His medication schedule is up to date', time: '09:20 AM', isOwn: true },
      { id: 5, senderId: 1, text: 'Perfect. I will visit him during rounds at 11 AM', time: '09:22 AM', isOwn: false },
    ],
    4: [
      { id: 1, senderId: 4, text: 'Can you cover Room 305 for 15 minutes?', time: '10:30 AM', isOwn: false },
      { id: 2, senderId: 'me', text: 'Sure, I will head there now', time: '10:32 AM', isOwn: true },
    ],
    7: [
      { id: 1, senderId: 7, text: 'X-ray results for patient ID 12345 are ready', time: '11:00 AM', isOwn: false },
      { id: 2, senderId: 7, text: 'Please inform Dr. Hassan', time: '11:01 AM', isOwn: false },
      { id: 3, senderId: 7, text: 'CT scan scheduled for 2 PM', time: '11:05 AM', isOwn: false },
    ],
  };

  // Mock alerts
  const mockAlerts = [
    { id: 1, type: 'urgent', title: 'Code Blue - Room 401', time: '2 min ago', read: false },
    { id: 2, type: 'warning', title: 'Lab results ready for Patient #1234', time: '15 min ago', read: false },
    { id: 3, type: 'info', title: 'Shift change reminder - 3 PM', time: '1 hour ago', read: true },
    { id: 4, type: 'info', title: 'New medication protocol update', time: '2 hours ago', read: true },
  ];

  useEffect(() => {
    fetchContacts();
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = async () => {
    try {
      const response = await api.get('/nurse/contacts');
      setContacts(response.data);
    } catch (error) {
      console.log('Using mock contacts data');
      setContacts(mockContacts);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const response = await api.get(`/nurse/messages/${contactId}`);
      setMessages(response.data);
    } catch (error) {
      console.log('Using mock messages data');
      setMessages(mockMessages[contactId] || []);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/nurse/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.log('Using mock alerts data');
      setAlerts(mockAlerts);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    const message = {
      id: Date.now(),
      senderId: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setMessages([...messages, message]);
    setNewMessage('');

    try {
      await api.post('/nurse/messages', {
        recipientId: selectedContact.id,
        text: newMessage,
      });
    } catch (error) {
      console.log('Message sent (mock mode)');
    }
  };

  const handleEmergencyRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/nurse/emergency', {
        type: emergencyType,
        location: emergencyLocation,
        details: emergencyDetails,
      });
      alert('Emergency request sent successfully!');
    } catch (error) {
      alert('Emergency request sent (mock mode)');
    }
    setShowEmergencyModal(false);
    setEmergencyType('');
    setEmergencyLocation('');
    setEmergencyDetails('');
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || contact.category === filterCategory;
    return matchesSearch && matchesCategory;
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
    container: {
      padding: '24px',
      backgroundColor: '#f8fafc',
      minHeight: 'calc(100vh - 64px)',
    },
    header: {
      marginBottom: '24px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#1e293b',
      margin: 0,
    },
    subtitle: {
      color: '#64748b',
      margin: '4px 0 0 0',
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '320px 1fr 300px',
      gap: '24px',
      height: 'calc(100vh - 180px)',
    },
    // Contacts Panel
    contactsPanel: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    contactsHeader: {
      padding: '20px',
      borderBottom: '1px solid #e2e8f0',
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '14px',
      marginBottom: '12px',
      outline: 'none',
    },
    filterTabs: {
      display: 'flex',
      gap: '8px',
    },
    filterTab: {
      padding: '8px 12px',
      border: 'none',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    contactsList: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
    },
    contactItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px',
      borderRadius: '12px',
      cursor: 'pointer',
      marginBottom: '4px',
      transition: 'all 0.2s',
    },
    contactAvatar: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontSize: '14px',
      marginRight: '12px',
      position: 'relative',
    },
    statusDot: {
      position: 'absolute',
      bottom: '2px',
      right: '2px',
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      border: '2px solid white',
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontWeight: '600',
      color: '#1e293b',
      fontSize: '14px',
      marginBottom: '2px',
    },
    contactRole: {
      color: '#64748b',
      fontSize: '12px',
    },
    unreadBadge: {
      backgroundColor: '#ef4444',
      color: 'white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
    },
    // Chat Panel
    chatPanel: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
    chatHeader: {
      padding: '16px 20px',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chatHeaderInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    chatActions: {
      display: 'flex',
      gap: '8px',
    },
    actionBtn: {
      padding: '8px 12px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
    },
    chatMessages: {
      flex: 1,
      overflowY: 'auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    emptyChat: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
    },
    messageRow: {
      display: 'flex',
      justifyContent: 'flex-start',
    },
    messageRowOwn: {
      display: 'flex',
      justifyContent: 'flex-end',
    },
    messageBubble: {
      maxWidth: '70%',
      padding: '12px 16px',
      borderRadius: '16px',
      fontSize: '14px',
      lineHeight: '1.5',
    },
    messageTime: {
      fontSize: '11px',
      marginTop: '4px',
    },
    chatInputArea: {
      padding: '16px 20px',
      borderTop: '1px solid #e2e8f0',
    },
    chatForm: {
      display: 'flex',
      gap: '12px',
    },
    messageInput: {
      flex: 1,
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '24px',
      fontSize: '14px',
      outline: 'none',
    },
    sendBtn: {
      padding: '12px 24px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '24px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    // Right Panel
    rightPanel: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    },
    quickActions: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '20px',
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '16px',
    },
    quickActionBtns: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    quickActionBtn: {
      padding: '12px 16px',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      backgroundColor: 'white',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.2s',
    },
    emergencyBtn: {
      padding: '14px 16px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      marginTop: '8px',
      transition: 'all 0.2s',
    },
    alertsSection: {
      flex: 1,
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      padding: '20px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
    alertsList: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    alertItem: {
      padding: '12px',
      borderRadius: '10px',
      display: 'flex',
      gap: '10px',
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: '13px',
      fontWeight: '500',
      color: '#1e293b',
      marginBottom: '2px',
    },
    alertTime: {
      fontSize: '11px',
      color: '#64748b',
    },
    // Modal
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '24px',
      width: '90%',
      maxWidth: '450px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#ef4444',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#64748b',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
      color: '#374151',
      fontSize: '14px',
    },
    select: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '14px',
      outline: 'none',
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical',
      minHeight: '100px',
      boxSizing: 'border-box',
    },
    submitEmergencyBtn: {
      width: '100%',
      padding: '14px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '8px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Messages & Communication</h1>
        <p style={styles.subtitle}>Stay connected with your team</p>
      </div>

      <div style={styles.mainGrid}>
        {/* Contacts Panel */}
        <div style={styles.contactsPanel}>
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
                { key: 'departments', label: 'Depts' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  style={{
                    ...styles.filterTab,
                    backgroundColor: filterCategory === tab.key ? '#3b82f6' : '#f1f5f9',
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
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  ...styles.contactItem,
                  backgroundColor: selectedContact?.id === contact.id ? '#eff6ff' : 'transparent',
                }}
                onClick={() => setSelectedContact(contact)}
              >
                <div style={styles.contactAvatar}>
                  {contact.avatar}
                  <div
                    style={{
                      ...styles.statusDot,
                      backgroundColor: getStatusColor(contact.status),
                    }}
                  />
                </div>
                <div style={styles.contactInfo}>
                  <div style={styles.contactName}>{contact.name}</div>
                  <div style={styles.contactRole}>{contact.role}</div>
                </div>
                {contact.unread > 0 && (
                  <div style={styles.unreadBadge}>{contact.unread}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div style={styles.chatPanel}>
          {selectedContact ? (
            <>
              <div style={styles.chatHeader}>
                <div style={styles.chatHeaderInfo}>
                  <div style={{ ...styles.contactAvatar, marginRight: 0 }}>
                    {selectedContact.avatar}
                    <div
                      style={{
                        ...styles.statusDot,
                        backgroundColor: getStatusColor(selectedContact.status),
                      }}
                    />
                  </div>
                  <div>
                    <div style={styles.contactName}>{selectedContact.name}</div>
                    <div style={styles.contactRole}>{selectedContact.role} - {selectedContact.status}</div>
                  </div>
                </div>
                <div style={styles.chatActions}>
                  <button style={styles.actionBtn}>📞 Call</button>
                  <button style={styles.actionBtn}>📹 Video</button>
                </div>
              </div>
              <div style={styles.chatMessages}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    style={message.isOwn ? styles.messageRowOwn : styles.messageRow}
                  >
                    <div
                      style={{
                        ...styles.messageBubble,
                        backgroundColor: message.isOwn ? '#3b82f6' : '#f1f5f9',
                        color: message.isOwn ? 'white' : '#1e293b',
                        borderBottomRightRadius: message.isOwn ? '4px' : '16px',
                        borderBottomLeftRadius: message.isOwn ? '16px' : '4px',
                      }}
                    >
                      <div>{message.text}</div>
                      <div
                        style={{
                          ...styles.messageTime,
                          color: message.isOwn ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                          textAlign: message.isOwn ? 'right' : 'left',
                        }}
                      >
                        {message.time}
                      </div>
                    </div>
                  </div>
                ))}
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
                  />
                  <button type="submit" style={styles.sendBtn}>
                    Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={styles.emptyChat}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>💬</div>
              <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>
                Select a conversation
              </div>
              <div style={{ fontSize: '14px' }}>
                Choose a contact to start messaging
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div style={styles.rightPanel}>
          {/* Quick Actions */}
          <div style={styles.quickActions}>
            <h3 style={styles.sectionTitle}>Quick Actions</h3>
            <div style={styles.quickActionBtns}>
              <button style={styles.quickActionBtn}>
                <span>👥</span> Group Chat
              </button>
              <button style={styles.quickActionBtn}>
                <span>📋</span> Call Directory
              </button>
              <button style={styles.quickActionBtn}>
                <span>📢</span> Broadcast Message
              </button>
              <button
                style={styles.emergencyBtn}
                onClick={() => setShowEmergencyModal(true)}
              >
                <span>🚨</span> Emergency Request
              </button>
            </div>
          </div>

          {/* Alerts Section */}
          <div style={styles.alertsSection}>
            <h3 style={styles.sectionTitle}>Recent Updates & Alerts</h3>
            <div style={styles.alertsList}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    ...styles.alertItem,
                    backgroundColor: getAlertColor(alert.type),
                    opacity: alert.read ? 0.7 : 1,
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{getAlertIcon(alert.type)}</span>
                  <div style={styles.alertContent}>
                    <div style={styles.alertTitle}>{alert.title}</div>
                    <div style={styles.alertTime}>{alert.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEmergencyModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <span>🚨</span> Emergency Request
              </h2>
              <button style={styles.closeBtn} onClick={() => setShowEmergencyModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEmergencyRequest}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Emergency Type *</label>
                <select
                  style={styles.select}
                  value={emergencyType}
                  onChange={(e) => setEmergencyType(e.target.value)}
                  required
                >
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
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g., Room 305, ICU Ward"
                  value={emergencyLocation}
                  onChange={(e) => setEmergencyLocation(e.target.value)}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Details</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Provide any additional details..."
                  value={emergencyDetails}
                  onChange={(e) => setEmergencyDetails(e.target.value)}
                />
              </div>
              <button type="submit" style={styles.submitEmergencyBtn}>
                Send Emergency Alert
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseMessages;
