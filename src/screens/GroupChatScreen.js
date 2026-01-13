import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import uuid from 'react-native-uuid';

const GroupChatScreen = () => {
  const route = useRoute();

  const { channelId, channelName, serverId, userId } = route.params;

  if (!channelId || !serverId || !userId) {
    return (
      <View style={styles.container}>
        <Text>Invalid chat data!</Text>
      </View>
    );
  }

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const flatListRef = useRef();

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('servers')
      .doc(serverId)
      .collection('channels')
      .doc(channelId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const list = snapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data(),
        }));
        setMessages(list);
      });

    return () => unsubscribe();
  }, [serverId, channelId]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    if (!text.trim()) return;

    const msg = {
      _id: uuid.v4(),
      text: text,
      sendBy: userId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    setText('');

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
  }, [text]);

  /* ================= UI ================= */
  const renderItem = ({ item }) => {
    const isMe = item.sendBy === userId;
    const time = item.createdAt?.toDate?.()
      ? item.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <View
        style={[
          styles.msgBubble,
          isMe ? styles.myMsg : styles.otherMsg,
        ]}
      >
        <Text style={{ color: isMe ? '#fff' : '#000' }}>{item.text}</Text>
        {time ? <Text style={styles.timeText}>{time}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{channelName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 10 }}
      />

      <View style={styles.inputBox}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          style={styles.input}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GroupChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 16, backgroundColor: '#eee', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  msgBubble: { padding: 10, marginVertical: 4, borderRadius: 12, maxWidth: '70%' },
  myMsg: { backgroundColor: '#0078fe', alignSelf: 'flex-end' },
  otherMsg: { backgroundColor: '#e5e5e5', alignSelf: 'flex-start' },
  timeText: { fontSize: 10, color: '#555', marginTop: 4, alignSelf: 'flex-end' },
  inputBox: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  input: { flex: 1, padding: 10, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  sendBtn: { backgroundColor: '#0078fe', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
});
