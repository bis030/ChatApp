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
  ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

const ServerDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { serverId, serverName } = route.params;

  const [userId, setUserId] = useState('');
  const [myRole, setMyRole] = useState('member');

  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);

  const [createChannelModal, setCreateChannelModal] = useState(false);
  const [membersModal, setMembersModal] = useState(false);
  const [channelOptionsModal, setChannelOptionsModal] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [renameChannelModal, setRenameChannelModal] = useState(false);
  const [transferOwnershipModal, setTransferOwnershipModal] = useState(false);

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [renameChannelName, setRenameChannelName] = useState('');
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);

  const availableRoles = ['admin', 'mod', 'member'];

  /* ================= USER ID ================= */
  useEffect(() => {
    AsyncStorage.getItem('USERID').then(setUserId);
  }, []);

  /* ================= SERVER + ROLE + MEMBERS ================= */
  useEffect(() => {
    if (!serverId || !userId) return;

    const unsub = firestore()
      .collection('servers')
      .doc(serverId)
      .onSnapshot(async doc => {
        const data = doc.data();
        if (!data) {
          console.log('No server data found');
          return;
        }

        // Determine user role
        if (data.owner === userId) {
          setMyRole('admin');
        } else if (data.moderators && data.moderators.includes(userId)) {
          setMyRole('mod');
        } else {
          setMyRole('member');
        }

        // Get members list (array of user IDs)
        const memberIds = data.members || [];
        const moderatorIds = data.moderators || [];

        if (memberIds.length === 0) {
          // Add owner as admin to the list
          if (data.owner) {
            const ownerDoc = await firestore().collection('users').doc(data.owner).get();
            setMembers([{
              uid: data.owner,
              role: 'admin',
              name: ownerDoc.exists ? ownerDoc.data().name : 'Owner',
            }]);
          }
          return;
        }

        // Fetch user details for all members
        const enriched = await Promise.all(
          memberIds.map(async (uid) => {
            const userDoc = await firestore().collection('users').doc(uid).get();
            
            // Determine role
            let role = 'member';
            if (uid === data.owner) {
              role = 'admin';
            } else if (moderatorIds.includes(uid)) {
              role = 'mod';
            }
            
            return {
              uid,
              role,
              name: userDoc.exists ? userDoc.data().name : uid,
            };
          })
        );

        // Add owner if not already in members array
        if (data.owner && !memberIds.includes(data.owner)) {
          const ownerDoc = await firestore().collection('users').doc(data.owner).get();
          enriched.unshift({
            uid: data.owner,
            role: 'admin',
            name: ownerDoc.exists ? ownerDoc.data().name : 'Owner',
          });
        }

        // Sort: admin first, then mod, then member
        const roleOrder = { admin: 0, mod: 1, member: 2 };
        enriched.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
        
        setMembers(enriched);
      });

    return () => unsub();
  }, [serverId, userId]);

  /* ================= CHANNELS ================= */
  useEffect(() => {
    if (!serverId || !userId) return;

    const unsub = firestore()
      .collection('servers')
      .doc(serverId)
      .collection('channels')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snapshot => {
        setChannels(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    return () => unsub();
  }, [serverId, userId]);

  /* ================= CREATE CHANNEL ================= */
  const createChannel = async () => {
    if (!newChannelName.trim() || selectedRoles.length === 0) {
      Alert.alert('Error', 'Channel name and roles required');
      return;
    }

    await firestore()
      .collection('servers')
      .doc(serverId)
      .collection('channels')
      .add({
        displayName: newChannelName,
        description: newChannelDescription,
        createdAt: firestore.FieldValue.serverTimestamp(),
        createdBy: userId,
        rolesAllowed: selectedRoles,
      });

    setCreateChannelModal(false);
    setNewChannelName('');
    setNewChannelDescription('');
    setSelectedRoles([]);
  };

  /* ================= CHANNEL ACTIONS ================= */
  const openChannelOptions = (channel) => {
    setSelectedChannel(channel);
    setChannelOptionsModal(true);
  };

  const deleteChannel = async () => {
    if (!selectedChannel) return;
    
    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete #${selectedChannel.displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await firestore()
              .collection('servers')
              .doc(serverId)
              .collection('channels')
              .doc(selectedChannel.id)
              .delete();
            setChannelOptionsModal(false);
            setSelectedChannel(null);
          },
        },
      ]
    );
  };

  const openRenameChannel = () => {
    setRenameChannelName(selectedChannel.displayName);
    setChannelOptionsModal(false);
    setRenameChannelModal(true);
  };

  const renameChannel = async () => {
    if (!renameChannelName.trim()) {
      Alert.alert('Error', 'Channel name cannot be empty');
      return;
    }

    await firestore()
      .collection('servers')
      .doc(serverId)
      .collection('channels')
      .doc(selectedChannel.id)
      .update({
        displayName: renameChannelName,
      });

    setRenameChannelModal(false);
    setSelectedChannel(null);
    setRenameChannelName('');
  };

  /* ================= MEMBER ACTIONS ================= */
  const kickMember = async (uid) => {
    Alert.alert(
      'Kick Member',
      'Are you sure you want to kick this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            // Remove from members array
            await firestore().collection('servers').doc(serverId).update({
              members: firestore.FieldValue.arrayRemove(uid),
            });
            
            // Also remove from moderators if they are a mod
            await firestore().collection('servers').doc(serverId).update({
              moderators: firestore.FieldValue.arrayRemove(uid),
            });
          },
        },
      ]
    );
  };

  const makeModerator = async (uid) => {
    // Add to moderators array directly without extra popup
    try {
      await firestore().collection('servers').doc(serverId).update({
        moderators: firestore.FieldValue.arrayUnion(uid),
      });
      Alert.alert('Success', 'Member promoted to moderator');
    } catch (error) {
      Alert.alert('Error', 'Failed to promote member');
    }
  };

  const removeModerator = async (uid) => {
    Alert.alert(
      'Remove Moderator',
      'Are you sure you want to remove moderator privileges?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await firestore().collection('servers').doc(serverId).update({
              moderators: firestore.FieldValue.arrayRemove(uid),
            });
            Alert.alert('Success', 'Moderator privileges removed');
          },
        },
      ]
    );
  };

  const leaveServer = async () => {
    Alert.alert(
      'Leave Server',
      'Are you sure you want to leave this server?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            // Remove current user from members array
            await firestore().collection('servers').doc(serverId).update({
              members: firestore.FieldValue.arrayRemove(userId),
            });
            
            // Also remove from moderators if they are a mod
            await firestore().collection('servers').doc(serverId).update({
              moderators: firestore.FieldValue.arrayRemove(userId),
            });
            
            navigation.popToTop();
          },
        },
      ]
    );
  };

  const openTransferOwnership = () => {
    setTransferOwnershipModal(true);
  };

  const transferOwnership = async () => {
    if (!selectedNewOwner) {
      Alert.alert('Error', 'Please select a new owner');
      return;
    }

    Alert.alert(
      'Transfer Ownership',
      `Are you sure you want to transfer ownership to ${members.find(m => m.uid === selectedNewOwner)?.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update owner field
              await firestore().collection('servers').doc(serverId).update({
                owner: selectedNewOwner,
              });
              
              // Remove new owner from moderators array if they were a mod
              await firestore().collection('servers').doc(serverId).update({
                moderators: firestore.FieldValue.arrayRemove(selectedNewOwner),
              });

              Alert.alert('Success', 'Ownership transferred successfully');
              setTransferOwnershipModal(false);
              setSelectedNewOwner(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to transfer ownership');
            }
          },
        },
      ]
    );
  };

  const deleteServerWithTransfer = () => {
    Alert.alert(
      'Delete Server',
      'To delete the server, you must first transfer ownership to another member.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer Ownership',
          onPress: openTransferOwnership,
        },
      ]
    );
  };

  /* ================= RENDER CHANNEL ================= */
  const renderChannel = ({ item }) => (
    <View style={styles.channelContainer}>
      <TouchableOpacity
        style={styles.channel}
        onPress={() =>
          navigation.navigate('GroupChatScreen', {
            serverId,
            channelId: item.id,
            channelName: item.displayName,
            userId,
          })
        }
      >
        <Text style={styles.channelText}># {item.displayName}</Text>
      </TouchableOpacity>
      
      {/* Admin and mod can see channel options */}
      {(myRole === 'admin' || myRole === 'mod') && (
        <TouchableOpacity 
          onPress={() => openChannelOptions(item)}
          style={styles.channelDots}
        >
          <Text style={styles.dots}>⋮</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  /* ================= RENDER MEMBER ================= */
  const renderMember = (member) => {
    const canManageMember = 
      (myRole === 'admin') || 
      (myRole === 'mod' && member.role === 'member');

    return (
      <View style={styles.memberRow} key={member.uid}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberRole}>({member.role})</Text>
        </View>

        {/* Show three dots for admin and mods based on permissions */}
        {canManageMember && member.uid !== userId && (
          <TouchableOpacity
            onPress={() => {
              const actions = [];
              
              // Only admin can promote to moderator or demote moderators
              if (myRole === 'admin') {
                if (member.role === 'member') {
                  actions.push({
                    text: 'Make Moderator',
                    onPress: () => makeModerator(member.uid)
                  });
                } else if (member.role === 'mod') {
                  actions.push({
                    text: 'Remove Moderator',
                    style: 'destructive',
                    onPress: () => removeModerator(member.uid)
                  });
                }
              }
              
              // Both admin and mod can kick members (but mod can only kick regular members)
              if (myRole === 'admin' || (myRole === 'mod' && member.role === 'member')) {
                actions.push({
                  text: 'Kick',
                  style: 'destructive',
                  onPress: () => kickMember(member.uid)
                });
              }
              
              actions.push({ text: 'Cancel', style: 'cancel' });
              
              Alert.alert(member.name, 'Choose an action', actions);
            }}
          >
            <Text style={styles.dots}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /* ================= RENDER TRANSFER OWNERSHIP MEMBER ================= */
  const renderTransferMember = (member) => {
    if (member.uid === userId) return null; // Don't show current admin
    
    return (
      <TouchableOpacity
        key={member.uid}
        style={[
          styles.transferMemberRow,
          selectedNewOwner === member.uid && styles.selectedMemberRow
        ]}
        onPress={() => setSelectedNewOwner(member.uid)}
      >
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberRole}>({member.role})</Text>
        </View>
        {selectedNewOwner === member.uid && (
          <Text style={styles.checkMark}>✓</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{serverName}</Text>

      <Text style={styles.sectionTitle}>Channels</Text>
      <FlatList 
        data={channels} 
        renderItem={renderChannel} 
        keyExtractor={i => i.id}
        style={styles.channelList}
      />

      {/* Admin and mod can create channels */}
      {(myRole === 'admin' || myRole === 'mod') && (
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setCreateChannelModal(true)}
        >
          <Text style={styles.buttonText}>➕ Create Channel</Text>
        </TouchableOpacity>
      )}

      {/* Everyone can see members */}
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setMembersModal(true)}
      >
        <Text style={styles.buttonText}>👥 See Members</Text>
      </TouchableOpacity>

      {/* Everyone can leave server */}
      <TouchableOpacity 
        style={styles.leaveButton}
        onPress={leaveServer}
      >
        <Text style={styles.leaveButtonText}>Leave Server</Text>
      </TouchableOpacity>

      {/* Only admin can delete server (with transfer ownership requirement) */}
      {myRole === 'admin' && (
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={deleteServerWithTransfer}
        >
          <Text style={styles.deleteButtonText}>Delete Server</Text>
        </TouchableOpacity>
      )}

      {/* MEMBERS MODAL */}
      <Modal visible={membersModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Members ({members.length})</Text>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No members found</Text>
            ) : (
              <ScrollView style={styles.membersList}>
                {members.map(renderMember)}
              </ScrollView>
            )}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setMembersModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CREATE CHANNEL MODAL */}
      <Modal visible={createChannelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create Channel</Text>
            <TextInput 
              style={styles.input}
              placeholder="Channel name" 
              value={newChannelName} 
              onChangeText={setNewChannelName} 
            />
            <TextInput 
              style={styles.input}
              placeholder="Description" 
              value={newChannelDescription} 
              onChangeText={setNewChannelDescription} 
            />
            <Text style={styles.subTitle}>Select roles that can access:</Text>
            {availableRoles.map(r => (
              <TouchableOpacity 
                key={r} 
                style={styles.roleOption}
                onPress={() => setSelectedRoles(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r])}
              >
                <Text style={styles.roleText}>
                  {selectedRoles.includes(r) ? '✅' : '⬜'} {r}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={createChannel}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setCreateChannelModal(false);
                  setNewChannelName('');
                  setNewChannelDescription('');
                  setSelectedRoles([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHANNEL OPTIONS MODAL */}
      <Modal visible={channelOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <Text style={styles.modalTitle}>
              Channel Options: #{selectedChannel?.displayName}
            </Text>
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={openRenameChannel}
            >
              <Text style={styles.optionButtonText}>✏️ Rename Channel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.optionButtonDanger}
              onPress={deleteChannel}
            >
              <Text style={styles.optionButtonDangerText}>🗑️ Delete Channel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setChannelOptionsModal(false);
                setSelectedChannel(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* RENAME CHANNEL MODAL */}
      <Modal visible={renameChannelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Rename Channel</Text>
            <TextInput 
              style={styles.input}
              placeholder="New channel name" 
              value={renameChannelName} 
              onChangeText={setRenameChannelName} 
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={renameChannel}
              >
                <Text style={styles.createButtonText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setRenameChannelModal(false);
                  setSelectedChannel(null);
                  setRenameChannelName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TRANSFER OWNERSHIP MODAL */}
      <Modal visible={transferOwnershipModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Transfer Ownership</Text>
            <Text style={styles.subTitle}>
              Select a member to transfer ownership to:
            </Text>
            <ScrollView style={styles.membersList}>
              {members.map(renderTransferMember)}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.createButton, !selectedNewOwner && styles.disabledButton]}
                onPress={transferOwnership}
                disabled={!selectedNewOwner}
              >
                <Text style={styles.createButtonText}>Transfer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setTransferOwnershipModal(false);
                  setSelectedNewOwner(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ServerDetailScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 10,
    color: '#555',
  },
  channelList: {
    maxHeight: 300,
    marginBottom: 10,
  },
  channelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
    paddingRight: 8,
  },
  channel: { 
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
  },
  channelText: {
    fontSize: 16,
    color: '#333',
  },
  channelDots: {
    padding: 8,
  },
  dots: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#8B0000',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: { 
    backgroundColor: 'white', 
    margin: 30, 
    padding: 20,
    borderRadius: 12,
    minWidth: 300,
    maxHeight: '80%',
  },
  optionsModal: {
    backgroundColor: 'white', 
    margin: 30, 
    padding: 20,
    borderRadius: 12,
    minWidth: 300,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  membersList: {
    maxHeight: 400,
  },
  memberRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  memberRole: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginVertical: 20,
  },
  roleOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  roleText: {
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButton: {
    backgroundColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  optionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionButtonDangerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionButtonDanger: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  transferMemberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  selectedMemberRow: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  checkMark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});