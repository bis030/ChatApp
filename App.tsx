import React from "react";
import {View,Text, StyleSheet } from "react-native";
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import SignUp from "./src/screens/SignUp";
import Login from "./src/screens/Login";
import AppNavigator from "./src/navigator/AppNavigator";
import  firebase  from '@react-native-firebase/app';


const App = () =>
{

  return(
    <GestureHandlerRootView>

      <AppNavigator/>
    </GestureHandlerRootView>
      
    
  );
} ;


export default App;