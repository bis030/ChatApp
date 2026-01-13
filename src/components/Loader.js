import { View, Text ,Modal,StyleSheet, Dimensions} from 'react-native'
import React from 'react'
import { ActivityIndicator } from 'react-native';


const Loader = ({visible}) => { // visible that we took from login is a obj itself , so use double bracket
  return (
   <Modal visible={visible} transparent>    
    
    <View style={styles.modalView}>      // transparent or bluury background //whole screen lai cover garxa
        
        <View style={styles.mainView}>     // having the loader // only loader ko paxadi hunxa
           
            <ActivityIndicator size={"large"}/> 
       
        </View>
    </View>
   </Modal>
  )
}

const styles=StyleSheet.create(
    {
        modalView:{
            width:Dimensions.get('window').width,
            height:Dimensions.get('window').height,
           backgroundColor:"rgba(0,0,0,.6)",
           alignItems:"center",
           justifyContent:"center",
        },
        mainView:{
            backgroundColor:"white",
            height:100,
            width:100,
            borderRadius:50,
            alignItems:"center",
           justifyContent:"center",

        },
    }
);

export default Loader;