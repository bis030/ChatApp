import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const Servers = () => {
  const navigation = useNavigation();

  const [userId, setUserId] = useState('');
  const [servers, setServers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverDescription, setServerDescription] = useState('');
  const [serverIcon, setServerIcon] = useState('');
  const [serverCategory, setServerCategory] = useState('Gaming');
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState('100');

  // 🔑 Load userId from AsyncStorage (same as Inbox)
  useEffect(() => {
    const getUserId = async () => {
      const uid = await AsyncStorage.getItem('USERID');
      setUserId(uid || '');
    };
    getUserId();




  }, []);

  // 🔑 Listen to servers where user is a member
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = firestore()
      .collection('servers')
      .where('members', 'array-contains', userId)
      .onSnapshot((snapshot) => {
        const serverList = [];
        snapshot.forEach((doc) => {
          serverList.push({ id: doc.id, ...doc.data() });
        });
        setServers(serverList);
      });

    return () => unsubscribe();
  }, [userId]);

  const createServer = async () => {
    if (!serverName.trim()) {
      Alert.alert('Error', 'Please enter a server name');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    try {
      const serverData = {
        name: serverName.trim(),
        description: serverDescription.trim(),
        icon: serverIcon.trim() || 'https://via.placeholder.com/100',
        category: serverCategory,
        isPublic: isPublic,
        maxMembers: parseInt(maxMembers) || 100,
        owner: userId,
        members: [userId],
        createdAt: firestore.FieldValue.serverTimestamp(),
        memberCount: 1,
      };

      await firestore().collection('servers').add(serverData);

      // Reset form
      setServerName('');
      setServerDescription('');
      setServerIcon('');
      setServerCategory('Gaming');
      setIsPublic(true);
      setMaxMembers('100');
      setModalVisible(false);

      Alert.alert('Success', 'Server created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create server: ' + error.message);
    }
  };

  const renderServerItem = ({ item }) => (
    <TouchableOpacity style={styles.serverItem}
    
     onPress={() =>
        navigation.navigate('ServerDetailScreen', {
          serverId: item.id,
          serverName: item.name,
        })
      }
    
    >
      <Image
        source={{ uri: item.icon }}
        style={styles.serverIcon}
      />
      <View style={styles.serverInfo}>
        <Text style={styles.serverName}>{item.name}</Text>
        <Text style={styles.serverMembers}>
          {item.memberCount} members • {item.category}
        </Text>
        {item.description ? (
          <Text style={styles.serverDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Servers</Text>
      </View>

      <FlatList
        data={servers}
        renderItem={renderServerItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No servers yet</Text>
            <Text style={styles.emptySubtext}>Create your first server!</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.createButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Server</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Server Icon URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://example.com/icon.png"
              value={serverIcon}
              onChangeText={setServerIcon}
            />

            <Text style={styles.label}>Server Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="My Awesome Server"
              value={serverName}
              onChangeText={setServerName}
              maxLength={100}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this server about?"
              value={serverDescription}
              onChangeText={setServerDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {['Gaming', 'Education', 'Technology', 'Music', 'Sports', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    serverCategory === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setServerCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      serverCategory === cat && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Privacy</Text>
            <View style={styles.privacyContainer}>
              <TouchableOpacity
                style={[styles.privacyButton, isPublic && styles.privacyButtonActive]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={[styles.privacyButtonText, isPublic && styles.privacyButtonTextActive]}>
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyButton, !isPublic && styles.privacyButtonActive]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={[styles.privacyButtonText, !isPublic && styles.privacyButtonTextActive]}>
                  Private
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Max Members</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              value={maxMembers}
              onChangeText={setMaxMembers}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={createServer}
            >
              <Text style={styles.submitButtonText}>Create Server</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#5865F2', padding: 16, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  listContainer: { padding: 16 },
  serverItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serverIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ddd' },
  serverInfo: { flex: 1, marginLeft: 16 },
  serverName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  serverMembers: { fontSize: 14, color: '#666', marginBottom: 4 },
  serverDescription: { fontSize: 14, color: '#888' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#666', marginBottom: 8 },
  emptySubtext: { fontSize: 16, color: '#999' },
  createButton: {
    position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#5865F2', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  createButtonText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#5865F2' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  cancelButton: { fontSize: 16, color: '#fff' },
  modalContent: { flex: 1, padding: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
  categoryButtonActive: { backgroundColor: '#5865F2', borderColor: '#5865F2' },
  categoryButtonText: { fontSize: 14, color: '#666' },
  categoryButtonTextActive: { color: '#fff', fontWeight: '600' },
  privacyContainer: { flexDirection: 'row', marginTop: 8 },
  privacyButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginRight: 8 },
  privacyButtonActive: { backgroundColor: '#5865F2', borderColor: '#5865F2' },
  privacyButtonText: { fontSize: 16, color: '#666' },
  privacyButtonTextActive: { color: '#fff', fontWeight: '600' },
  submitButton: { backgroundColor: '#5865F2', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  submitButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
});

export default Servers;
