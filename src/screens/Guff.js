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

const Guff = () => {
  const route = useRoute();

  const myId = route.params?.myId;
  const otherUser = route.params?.otherUser;
  const otherId = otherUser?.userId;

  if (!myId || !otherId) {
    return (
      <View style={styles.container}>
        <Text>Invalid chat data!</Text>
      </View>
    );
  }

  // 🔑 SAME CHAT ID FOR BOTH USERS
  const chatId = [myId, otherId].sort().join('_');

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const flatListRef = useRef();

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('chats')
      .doc(chatId)
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
  }, [chatId]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    if (!text.trim()) return;

    const msg = {
      _id: uuid.v4(),
      text: text,
      sendBy: myId,
      sendTo: otherId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    setText('');

    await firestore()
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .add(msg);

    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, [text]);

  /* ================= UI ================= */
  const renderItem = ({ item }) => {
    const isMe = item.sendBy === myId;

    // Handle timestamp safely
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

export default Guff;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  msgBubble: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 12,
    maxWidth: '70%',
  },
  myMsg: {
    backgroundColor: '#0078fe',
    alignSelf: 'flex-end',
  },
  otherMsg: {
    backgroundColor: '#e5e5e5',
    alignSelf: 'flex-start',
  },
  timeText: {
    fontSize: 10,
    color: '#555',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputBox: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  sendBtn: {
    backgroundColor: '#0078fe',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
