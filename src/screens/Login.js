import { View, Text, TouchableOpacity,StyleSheet } from 'react-native'
import React,{useState} from 'react'
import { TextInput } from 'react-native-gesture-handler'

import {useNavigation } from '@react-navigation/native';

import firestore from "@react-native-firebase/firestore";
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Loader from "../components/Loader";

const Login = () => {

    const [Visible,setVisible]= useState(false);
    const navigation = useNavigation();

    const [Email,setEmail]= useState("");
    const [Password,setPassword]= useState("");


    const toTheNext = async( name, email , userId)=>
{

await AsyncStorage.setItem('EMAIL',email);
await AsyncStorage.setItem('NAME',name);
await AsyncStorage.setItem('USERID',userId);

 navigation.navigate("ChatScreen");

}



  return (
    <View style={styles.container}>
        
      <Text style={styles.title } >Login Page</Text>
      
      <TextInput placeholder='Enter you email' style={styles.textBox} onChangeText={(text)=>setEmail(text)} />
      <TextInput placeholder='Enter you password'  style={styles.textBox} onChangeText={(text)=>setPassword(text)} />
      
        <TouchableOpacity style={styles.btn} onPress={()=>{ 

            if ( !Email || !Password )
            {
                Alert.alert(" empty jnput");
            }
            else{
                setVisible(true);

            firestore().collection("users").where("email","==",Email).get().then(
               snapshot => {  //this snapshot can ba also wriiten res/ response as in the video
                        setVisible(false);
                                if (snapshot.empty) {

                                Alert.alert("Error", "User not found");
                                return;
                                }

                                const userData = snapshot.docs[0].data();

                                if (userData.password === Password) {

                                toTheNext(
                                    snapshot.docs[0].data().name ,
                                    snapshot.docs[0].data().email,
                                    snapshot.docs[0].data().userId,

                                );

                                } else {
                                Alert.alert("Error", "Incorrect password");
                                }
                            }
            ).catch( error => { setVisible(false);
                 Alert.alert("some eroor "); } ); 
        }
    }
    
    
        } >
            <Text style={styles.btnText} > LOGIN </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={()=> {navigation.navigate("SignUp");} }>
            <Text style={styles.btnText}> Sign UP </Text>
        </TouchableOpacity>
       
       <Loader visible={Visible}/>

    </View>
  )
}



const styles =StyleSheet.create(
    {
        container:{
            flex:1,
            alignItems:"center",
            
        },
        title:{
            marginTop:"20%",
            fontSize:25,
        },
        textBox:{
            marginTop:15,
            paddingLeft:15,
            width: "80%",
            borderColor:"black",
            borderRadius:15,
            borderWidth:1,

        },
        btn:{
            marginTop:20,
            
            backgroundColor:"orange",
            textAlign:"center",
            padding:10,
            borderRadius:10,
        },
        btnText:{
            color:"white",

        },
        login:{
            marginTop:20,
            textDecorationLine:"underline",
            fontWeight:"900",
            color:"blue",
            fontSize:18,
        },


    }
);

export default Login ;