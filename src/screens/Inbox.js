
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const Inbox = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [myId, setMyId] = useState('');

  useEffect(() => {
    getUsers();
  }, []);

  const getUsers = async () => {
    const email = await AsyncStorage.getItem('EMAIL');
    const uid = await AsyncStorage.getItem('USERID');
    setMyId(uid);

    let list = [];

    const snapshot = await firestore()
      .collection('users')
      .where('email', '!=', email)
      .get();

    snapshot.docs.forEach(doc => {
      list.push(doc.data());
    });

    setUsers(list);
  };

  return (
    <View style={styles.container}>
      <View style={styles.heade}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Guff', {
                myId: myId,
                otherUser: item,
              })
            }
          >
            <View style={styles.userBox}>
              <Image
                source={{
                  uri: 'https://cdn.pixabay.com/photo/2020/06/30/10/23/icon-5355896_640.png',
                }}
                style={{ width: 50, height: 50 }}
              />
              <Text style={styles.name}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};




const styles= StyleSheet.create(
  { 
    container:{
      flex:1,
      margin:5,
    },

    heade:{
      width:"100%",
      height: 50,
      flexDirection:"row",



    },
    title:{
      fontSize:22,
      fontWeight:"bold",
    },
    userList:{

    },
    userBox:{
      width:"90%",
      height:60,
      borderWidth:1,
      borderRadius:15,
      flexDirection:"row",
      alignSelf:"center",
      alignItems:"center",


    },
    name:{
      color:"black",
      fontSize:20,
    },
  }
);

export default Inbox;
