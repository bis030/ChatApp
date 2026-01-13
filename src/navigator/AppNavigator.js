import { View, Text } from 'react-native';
import React from 'react';

import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";

import Splash from '../screens/Splash';
import SignUp from '../screens/SignUp';
import Login from '../screens/Login';
import ChatScreen from '../screens/ChatScreen';

import Inbox from '../screens/Inbox';
import Guff from '../screens/Guff';


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    
    <NavigationContainer>

        <Stack.Navigator>

            <Stack.Screen 
            name="Splash" component={Splash} options={ {headerShown:false }}/>
            <Stack.Screen 
            name="SignUp" component={SignUp} options={ {headerShown:false }}/>
            <Stack.Screen 
            name="Login" component={Login} options={ {headerShown:false }}/>

            <Stack.Screen 
            name="Inbox" component={Inbox} options={ {headerShown:false }}/>

            <Stack.Screen 
            name="ChatScreen" component={ChatScreen} options={ {headerShown:false }}/>

            <Stack.Screen 
            name="Guff" component={Guff} options={ {headerShown:true }}/>
            
        </Stack.Navigator>
    </NavigationContainer>


  )
}

export default AppNavigator