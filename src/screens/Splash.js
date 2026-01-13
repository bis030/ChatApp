import { View, Text, StyleSheet } from 'react-native'
import React,{useEffect} from 'react'
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SignUp from './SignUp';

const Splash = () => {
    
    const navigation = useNavigation();

    useEffect(
        ()=>{
            setTimeout(
                ()=>{
                    navigation.navigate("Login");
                },3000
            );
        },[]

    );

    const checkLogin =async()=>
    {

       const id=  await AsyncStorage.getItem("USERID");

       if(id !==null)
       {
        navigation.navigate("ChatScreen");
       }
       else{
        navigation.navigate("Login");
       }
    }

  return (
    <View style={styles.container}>
      <Text style={styles.txt}> Welcome to ChatApp</Text>
    </View>
  )
}

const styles=StyleSheet.create(
    {

        container:{
                flex:1,
                backgroundColor:"#FFEB3B",
                justifyContent:"center",
                alignItems:"center",
        },
        txt:{
            color:"white",
            textAlign:"center",
    
        },

    }
);

export default Splash