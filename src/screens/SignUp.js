import { View, Text, TouchableOpacity,StyleSheet, Alert } from 'react-native'
import React,{useState} from 'react'
import { TextInput } from 'react-native-gesture-handler'

import {useNavigation } from '@react-navigation/native';

import firestore from "@react-native-firebase/firestore";
import uuid from "react-native-uuid";



const SignUp = () => {

    const registerUser =() =>{

    const userId = uuid.v4(); // this is a function , that generates strings

    firestore().collection("users").doc(userId).set({    // here we have set the docId as userID , 
                                                         // which makes it easier to acces docID to us later
        name:Name,
        mobile:Mobile,
        email:Email,
        password: Password,
        userId:userId,

    }) . then(respons =>{ console.log("succesful entry") ; 

    navigation.navigate("Login"); // this is run after succesful signup

    }) .catch(error=> {console.log("error ") ; }) ;

}; //then is executed if sueccesful operation , otherwise goes to catch block



const Validate =()=>
{
 let isValid=true;
 if (Name== "" || Mobile=="" || Email ==""|| Password=="" || ConfirmPass == "")
 {
    isValid=false;
 }
 if (Password !== ConfirmPass)
 {
    isValid=false;
 }

 return isValid;  // ftn must ,return this , otherwise logic is incomplete
};


    const navigation = useNavigation();

    const [Name,setName]= useState("");
    const [Mobile,setMobile]= useState("");
    const [Email,setEmail]= useState("");
    const [Password,setPassword]= useState("");
    const [ConfirmPass,setConfirmPass]= useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title } >SignUp</Text>
      <TextInput placeholder='Enter you name' style={styles.textBox} onChangeText={(text)=>setName(text)} />
      <TextInput placeholder='Enter mobile NO' style={styles.textBox} onChangeText={(text)=>setMobile(text)} />

      <TextInput placeholder='Enter you email' style={styles.textBox} onChangeText={(text)=>setEmail(text)} />
      <TextInput placeholder='Enter you password'  style={styles.textBox} onChangeText={(text)=>setPassword(text)} />
      <TextInput placeholder='conform password'  style={styles.textBox} onChangeText={(text)=>setConfirmPass(text)} />
      
      
        <TouchableOpacity style={styles.btn} onPress={ ()=>
        {
            if(Validate())
            {
                registerUser();
            }
            else{
                Alert.alert(" empty field");
            }
        }
        }>
            <Text style={styles.btnText} > Sign UP </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={()=>{ navigation.goBack(); }
        } >
            <Text style={styles.login} > Login </Text>
        </TouchableOpacity>

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

export default SignUp ;