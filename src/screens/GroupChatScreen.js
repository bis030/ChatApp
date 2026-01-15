import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import uuid from 'react-native-uuid';

const GroupChatScreen = () => {
  const route = useRoute();

  const { channelId, channelName, serverId, userId, userName, userRole = 'member' } = route.params;

  if (!channelId || !serverId || !userId) {
    return (
      <View style={styles.container}>
        <Text>Invalid chat data!</Text>
      </View>
    );
  }

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [editingMsg, setEditingMsg] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [userNames, setUserNames] = useState({});
  const flatListRef = useRef();

  /* ================= LOAD USER NAMES ================= */
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        // Get all unique user IDs from messages
        const uniqueUserIds = [...new Set(messages.map(msg => msg.sendBy))];
        
        // Fetch user names from Firestore
        const names = {};
        for (const uid of uniqueUserIds) {
          if (!userNames[uid] && uid !== userId) {
            try {
              const userDoc = await firestore()
                .collection('users')
                .doc(uid)
                .get();
              
              if (userDoc.exists) {
                names[uid] = userDoc.data()?.name || userDoc.data()?.displayName || 'User';
              } else {
                names[uid] = 'User';
              }
            } catch (error) {
              console.error('Error fetching user name:', error);
              names[uid] = 'User';
            }
          }
        }
        
        if (Object.keys(names).length > 0) {
          setUserNames(prev => ({ ...prev, ...names }));
        }
      } catch (error) {
        console.error('Error loading user names:', error);
      }
    };

    if (messages.length > 0) {
      loadUserNames();
    }
  }, [messages, userId]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('servers')
      .doc(serverId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const list = snapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data(),
          }));
          setMessages(list);
        },
        error => {
          console.error('Error loading messages:', error);
        }
      );

    return () => unsubscribe();
  }, [serverId, channelId]);

  /* ================= AUTO-SCROLL TO LATEST MESSAGE ================= */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  /* ================= SEND OR EDIT MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    if (editingMsg) {
      // EDIT EXISTING MESSAGE
      try {
        const messageRef = firestore()
          .collection('servers')
          .doc(serverId)
          .collection('channels')
          .doc(channelId)
          .collection('messages')
          .doc(editingMsg._id);

        await messageRef.update({
          text: trimmedText,
          edited: true,
          editedAt: firestore.FieldValue.serverTimestamp(),
        });

        setEditingMsg(null);
        setText('');
        console.log('Message edited successfully');
      } catch (error) {
        console.error('Error editing message:', error);
        Alert.alert('Error', 'Failed to edit message: ' + error.message);
      }
    } else {
      // SEND NEW MESSAGE
      const msg = {
        text: trimmedText,
        sendBy: userId,
        senderName: userName || 'User',
        createdAt: firestore.FieldValue.serverTimestamp(),
        reactions: {},
      };

      setText('');

      try {
        await firestore()
          .collection('servers')
          .doc(serverId)
          .collection('channels')
          .doc(channelId)
          .collection('messages')
          .add(msg);

        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }, 100);
        
        console.log('Message sent successfully');
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message: ' + error.message);
        setText(trimmedText); // Restore text on error
      }
    }
  }, [text, editingMsg, serverId, channelId, userId, userName]);

  /* ================= DELETE MESSAGE ================= */
  const deleteMessage = useCallback(async (message) => {
    const isSender = message.sendBy === userId;
    const isMod = userRole === 'mod' || userRole === 'admin';

    // Check if user has permission to delete
    if (!isSender && !isMod) {
      Alert.alert('Permission Denied', 'You cannot delete this message');
      return;
    }

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {
            setShowOptionsModal(false);
            setSelectedMessage(null);
          }
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('servers')
                .doc(serverId)
                .collection('channels')
                .doc(channelId)
                .collection('messages')
                .doc(message._id)
                .delete();

              setShowOptionsModal(false);
              setSelectedMessage(null);
              console.log('Message deleted successfully');
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message: ' + error.message);
            }
          },
        },
      ]
    );
  }, [serverId, channelId, userId, userRole]);

  /* ================= START EDITING MESSAGE ================= */
  const startEdit = useCallback((message) => {
    if (message.sendBy !== userId) {
      Alert.alert('Permission Denied', 'You can only edit your own messages');
      return;
    }

    setEditingMsg(message);
    setText(message.text);
    setShowOptionsModal(false);
    setSelectedMessage(null);
  }, [userId]);

  /* ================= CANCEL EDITING ================= */
  const cancelEdit = useCallback(() => {
    setEditingMsg(null);
    setText('');
  }, []);

  /* ================= TOGGLE REACTION ================= */
  const toggleReaction = useCallback(async (message, emoji) => {
    try {
      const messageRef = firestore()
        .collection('servers')
        .doc(serverId)
        .collection('channels')
        .doc(channelId)
        .collection('messages')
        .doc(message._id);

      // Get fresh data from Firebase
      const messageDoc = await messageRef.get();
      
      if (!messageDoc.exists) {
        console.error('Message not found');
        Alert.alert('Error', 'Message not found');
        return;
      }

      const messageData = messageDoc.data();
      const currentReactions = messageData.reactions || {};

      // Get array of user IDs who reacted with this emoji
      const usersWhoReacted = currentReactions[emoji] || [];

      // Create updated reactions object
      let updatedReactions = { ...currentReactions };

      if (usersWhoReacted.includes(userId)) {
        // REMOVE REACTION: User already reacted, so remove them
        const filteredUsers = usersWhoReacted.filter(id => id !== userId);
        
        if (filteredUsers.length === 0) {
          // No users left for this emoji, remove the emoji key
          delete updatedReactions[emoji];
        } else {
          updatedReactions[emoji] = filteredUsers;
        }
      } else {
        // ADD REACTION: User hasn't reacted yet, add them
        updatedReactions[emoji] = [...usersWhoReacted, userId];
      }

      // Update in Firebase
      await messageRef.update({
        reactions: updatedReactions,
      });

      console.log('Reaction toggled successfully');
    } catch (error) {
      console.error('Error toggling reaction:', error);
      Alert.alert('Error', 'Failed to update reaction: ' + error.message);
    }
  }, [serverId, channelId, userId]);

  /* ================= OPEN MESSAGE OPTIONS ================= */
  const openMessageOptions = useCallback((message) => {
    setSelectedMessage(message);
    setShowOptionsModal(true);
  }, []);

  /* ================= CLOSE MESSAGE OPTIONS ================= */
  const closeMessageOptions = useCallback(() => {
    setShowOptionsModal(false);
    setTimeout(() => {
      setSelectedMessage(null);
    }, 300);
  }, []);

  /* ================= HANDLE REACTION FROM MODAL ================= */
  const handleReactionFromModal = useCallback((emoji) => {
    if (selectedMessage) {
      toggleReaction(selectedMessage, emoji);
      closeMessageOptions();
    }
  }, [selectedMessage, toggleReaction, closeMessageOptions]);

  /* ================= GET SENDER NAME ================= */
  const getSenderName = useCallback((message) => {
    if (message.sendBy === userId) {
      return 'You';
    }
    
    // First try to get name from message data
    if (message.senderName) {
      return message.senderName;
    }
    
    // Then try from cached user names
    if (userNames[message.sendBy]) {
      return userNames[message.sendBy];
    }
    
    // Default
    return 'User';
  }, [userId, userNames]);

  /* ================= RENDER MESSAGE ITEM ================= */
  const renderItem = ({ item }) => {
    const isMe = item.sendBy === userId;
    const time = item.createdAt?.toDate?.()
      ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    const reactions = item.reactions || {};
    const hasReactions = Object.keys(reactions).length > 0;
    const senderName = getSenderName(item);

    return (
      <View style={{ marginVertical: 4, paddingHorizontal: 10 }}>
        <TouchableOpacity
          onLongPress={() => openMessageOptions(item)}
          style={[
            styles.msgBubble,
            isMe ? styles.myMsg : styles.otherMsg,
          ]}
          activeOpacity={0.7}
        >
          {/* SENDER NAME (only for others' messages) */}
          {!isMe && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          
          <Text style={{ color: isMe ? '#fff' : '#000' }}>{item.text}</Text>
          
          {item.edited && (
            <Text style={[styles.editedText, { color: isMe ? '#ddd' : '#666' }]}>
              (edited)
            </Text>
          )}
          
          {time ? <Text style={[styles.timeText, { color: isMe ? '#ddd' : '#555' }]}>{time}</Text> : null}
        </TouchableOpacity>

        {/* REACTIONS DISPLAY */}
        {hasReactions && (
          <View style={[styles.reactionsContainer, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
            {Object.entries(reactions).map(([emoji, users]) => {
              const userReacted = users.includes(userId);
              const count = users.length;
              
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.reactionBadge,
                    userReacted && styles.reactionBadgeActive,
                  ]}
                  onPress={() => toggleReaction(item, emoji)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  <Text style={styles.reactionCount}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{channelName}</Text>
      </View>

      {/* MESSAGES LIST */}
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      {/* EDITING BANNER */}
      {editingMsg && (
        <View style={styles.editingBanner}>
          <Text style={styles.editingText}>Editing message</Text>
          <TouchableOpacity onPress={cancelEdit}>
            <Text style={styles.cancelEdit}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* INPUT BOX */}
      <View style={styles.inputBox}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={editingMsg ? "Edit message..." : "Type a message..."}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>
            {editingMsg ? 'Save' : 'Send'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MESSAGE OPTIONS MODAL */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={closeMessageOptions}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMessageOptions}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.optionsMenu}>
              {/* QUICK REACTIONS */}
              <View style={styles.quickReactions}>
                <Text style={styles.quickReactionsTitle}>React to message</Text>
                <View style={styles.quickReactionsRow}>
                  <TouchableOpacity
                    style={styles.quickReactionBtn}
                    onPress={() => handleReactionFromModal('👍')}
                  >
                    <Text style={styles.quickReactionEmoji}>👍</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickReactionBtn}
                    onPress={() => handleReactionFromModal('❤️')}
                  >
                    <Text style={styles.quickReactionEmoji}>❤️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickReactionBtn}
                    onPress={() => handleReactionFromModal('😂')}
                  >
                    <Text style={styles.quickReactionEmoji}>😂</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* EDIT OPTION (Only for sender) */}
              {selectedMessage && selectedMessage.sendBy === userId && (
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => startEdit(selectedMessage)}
                >
                  <Text style={styles.menuText}>✏️ Edit Message</Text>
                </TouchableOpacity>
              )}

              {/* DELETE OPTION (Sender OR Mod/Admin) */}
              {selectedMessage && (
                selectedMessage.sendBy === userId || 
                userRole === 'mod' || 
                userRole === 'admin'
              ) && (
                <TouchableOpacity
                  style={styles.menuOption}
                  onPress={() => deleteMessage(selectedMessage)}
                >
                  <Text style={[styles.menuText, { color: '#ff3b30' }]}>
                    🗑️ Delete Message
                  </Text>
                </TouchableOpacity>
              )}

              {/* CANCEL BUTTON */}
              <TouchableOpacity
                style={[styles.menuOption, styles.menuOptionLast]}
                onPress={closeMessageOptions}
              >
                <Text style={[styles.menuText, { fontWeight: '600' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { 
    padding: 16, 
    backgroundColor: '#eee', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  msgBubble: { 
    padding: 10, 
    marginVertical: 4, 
    borderRadius: 12, 
    maxWidth: '70%' 
  },
  myMsg: { 
    backgroundColor: '#0078fe', 
    alignSelf: 'flex-end' 
  },
  otherMsg: { 
    backgroundColor: '#e5e5e5', 
    alignSelf: 'flex-start' 
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0078fe',
    marginBottom: 4,
  },
  timeText: { 
    fontSize: 10, 
    marginTop: 4, 
    alignSelf: 'flex-end' 
  },
  editedText: { 
    fontSize: 10, 
    fontStyle: 'italic', 
    marginTop: 2 
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 4,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reactionBadgeActive: {
    backgroundColor: '#d0e8ff',
    borderColor: '#0078fe',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { 
    fontSize: 12, 
    marginLeft: 4, 
    color: '#555',
    fontWeight: '600',
  },
  inputBox: { 
    flexDirection: 'row', 
    padding: 10, 
    borderTopWidth: 1, 
    borderColor: '#ddd', 
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: { 
    flex: 1, 
    padding: 10, 
    borderRadius: 20, 
    backgroundColor: '#f0f0f0', 
    marginRight: 10,
    maxHeight: 100,
  },
  sendBtn: { 
    backgroundColor: '#0078fe', 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ffc107',
  },
  editingText: { 
    color: '#856404', 
    fontWeight: '500' 
  },
  cancelEdit: { 
    color: '#0078fe', 
    fontWeight: 'bold' 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  quickReactions: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  quickReactionsTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickReactionBtn: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 30,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickReactionEmoji: {
    fontSize: 36,
  },
  menuOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  menuOptionLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    fontSize: 17,
    color: '#000',
  },
});