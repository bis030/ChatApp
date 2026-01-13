import { View, Text,StyleSheet, TouchableOpacity } from 'react-native'
import React, { useState } from 'react';
import Inbox from './Inbox';
import Servers from "./Servers";

const ChatScreen = () => {

  const [Selected,setSelected]= useState("0");

  return (
    <View style={styles.container}>
      
      <View style={styles.topTab}> 

        <TouchableOpacity onPress={ ()=>{ setSelected("0") ;}} >   <Text style={[styles.btnText , { color: Selected === "0" ? "white" : "black" }]}> Inbox</Text> </TouchableOpacity>
         <TouchableOpacity onPress={ ()=>{ setSelected("1") ;}}> <Text style={[styles.btnText , { color: Selected === "1" ? "white" : "black" }]}  > Servers</Text> </TouchableOpacity>
        
        </View>

        {
          Selected == "0" ? <Inbox/> : <Servers/>

        }


    </View>
  )
}

const styles=StyleSheet.create(
  {
    container:{
      flex:1,

    },
    topTab:{
      paddingHorizontal:15,
        backgroundColor:"brown",
        width:"100%",
        height:50,
        color:"white",
        flexDirection:"row",
        justifyContent:"space-evenly",
        alignItems:"center",
    },

    btnText:{
      color:"white",
      
      fontSize:19,
    },
  }
);

export default ChatScreen