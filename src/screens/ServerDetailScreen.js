import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';

const ServerDetailScreen = () => {
  const route = useRoute();
  const { serverId, serverName } = route.params;

  const [userId, setUserId] = useState('');
  const [channels, setChannels] = useState([]);
  const [createChannelModalVisible, setCreateChannelModalVisible] = useState(false);
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberUserId, setMemberUserId] = useState('');

  // NEW: roles selection
  const availableRoles = ['admin', 'mod', 'member'];
  const [selectedRoles, setSelectedRoles] = useState([]);

  const toggleRole = (role) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // Fetch USERID from AsyncStorage
  useEffect(() => {
    const fetchUserId = async () => {
      const uid = await AsyncStorage.getItem('USERID');
      setUserId(uid);
    };
    fetchUserId();
  }, []);

  // Listen to channels and filter by user role
  useEffect(() => {
    if (!serverId || !userId) return;

    let unsubscribe;

    const initListener = async () => {
      // Fetch server data
      const serverDoc = await firestore().collection('servers').doc(serverId).get();
      const serverData = serverDoc.data();

      // Determine user's role
      let role = 'member';
      if (serverData.owner === userId) {
        role = 'admin'; // Treat owner as admin
      }

      // Listen to channels
      unsubscribe = firestore()
        .collection('servers')
        .doc(serverId)
        .collection('channels')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
          const channelList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Filter channels by allowed roles
          const accessibleChannels = channelList.filter(ch => ch.rolesAllowed?.includes(role));

          setChannels(accessibleChannels);
        });
    };

    initListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [serverId, userId]);

  // Create channel with roles
  const createChannel = async () => {
    if (!newChannelName.trim()) {
      Alert.alert('Error', 'Please enter a channel name');
      return;
    }

    if (selectedRoles.length === 0) {
      Alert.alert('Error', 'Select at least one role');
      return;
    }

    try {
      await firestore()
        .collection('servers')
        .doc(serverId)
        .collection('channels')
        .add({
          name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
          displayName: newChannelName.trim(),
          description: newChannelDescription.trim(),
          type: 'text',
          createdAt: firestore.FieldValue.serverTimestamp(),
          createdBy: userId,
          rolesAllowed: selectedRoles, // store allowed roles
        });

      setNewChannelName('');
      setNewChannelDescription('');
      setSelectedRoles([]);
      setCreateChannelModalVisible(false);

      Alert.alert('Success', 'Channel created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create channel: ' + error.message);
    }
  };

  const addMember = async () => {
    if (!memberUserId.trim() && !memberEmail.trim()) {
      Alert.alert('Error', 'Please enter a User ID or Email');
      return;
    }

    try {
      await firestore()
        .collection('servers')
        .doc(serverId)
        .update({
          members: firestore.FieldValue.arrayUnion(memberUserId.trim() || memberEmail.trim()),
          memberCount: firestore.FieldValue.increment(1),
        });

      setMemberEmail('');
      setMemberUserId('');
      setAddMemberModalVisible(false);

      Alert.alert('Success', 'Member added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add member: ' + error.message);
    }
  };

  const renderChannelItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.channelItem}
      onPress={() => {
        Alert.alert('Channel', `Opening ${item.displayName}`);
      }}
    >
      <View style={styles.channelIcon}>
        <Text style={styles.channelHash}>#</Text>
      </View>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{item.displayName}</Text>
        {item.description ? (
          <Text style={styles.channelDescription} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{serverName}</Text>
      </View>

      {/* Channels List */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>TEXT CHANNELS</Text>
        </View>

        <FlatList
          data={channels}
          renderItem={renderChannelItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.channelsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No channels yet</Text>
              <Text style={styles.emptySubtext}>Create your first channel!</Text>
            </View>
          }
        />

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCreateChannelModalVisible(true)}
          >
            <Text style={styles.actionButtonIcon}>+</Text>
            <Text style={styles.actionButtonText}>Create Channel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.addMemberButton]}
            onPress={() => setAddMemberModalVisible(true)}
          >
            <Text style={styles.actionButtonIcon}>👤</Text>
            <Text style={styles.actionButtonText}>Add Member</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Channel Modal */}
      <Modal visible={createChannelModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Channel</Text>

            <Text>Channel Name:</Text>
            <TextInput
              value={newChannelName}
              onChangeText={setNewChannelName}
              placeholder="Enter channel name"
              style={styles.input}
            />

            <Text>Channel Description:</Text>
            <TextInput
              value={newChannelDescription}
              onChangeText={setNewChannelDescription}
              placeholder="Optional description"
              style={styles.input}
            />

            <Text style={{ marginTop: 10 }}>Roles Allowed:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 5 }}>
              {availableRoles.map(role => (
                <TouchableOpacity
                  key={role}
                  onPress={() => toggleRole(role)}
                  style={{
                    padding: 6,
                    margin: 4,
                    borderWidth: 1,
                    borderColor: selectedRoles.includes(role) ? 'green' : '#ccc',
                    borderRadius: 5,
                    backgroundColor: selectedRoles.includes(role) ? '#e0ffe0' : '#fff',
                  }}
                >
                  <Text>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={styles.modalButton} onPress={createChannel}>
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: 'grey' }]} onPress={() => setCreateChannelModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      {/* Keep your previous add member modal code here */}
    </View>
  );
};

// ====== Styles ======
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#eee', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  channelsList: { paddingBottom: 16 },
  channelItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  channelIcon: { width: 24, alignItems: 'center' },
  channelHash: { fontSize: 16, color: '#888' },
  channelInfo: { marginLeft: 8 },
  channelName: { fontSize: 16, fontWeight: '500' },
  channelDescription: { fontSize: 12, color: '#666' },
  emptyContainer: { alignItems: 'center', marginTop: 32 },
  emptyText: { fontSize: 16, fontWeight: 'bold' },
  emptySubtext: { fontSize: 12, color: '#888' },
  bottomActions: { flexDirection: 'row', marginTop: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  addMemberButton: {},
  actionButtonIcon: { fontSize: 18, marginRight: 4 },
  actionButtonText: { fontSize: 14 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000aa' },
  modalContent: { width: '80%', padding: 20, backgroundColor: 'white', borderRadius: 8 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginVertical: 10 },
  modalButton: { flex: 1, backgroundColor: 'blue', padding: 10, marginHorizontal: 5, borderRadius: 5 },
  modalButtonText: { color: 'white', fontWeight: 'bold', textAlign: 'center' },
});

export default ServerDetailScreen;
