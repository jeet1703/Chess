import React from 'react'
import './App.css'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {Landing} from './screens/Landing';
import {Game} from './screens/Game';



const hello = () => {
  return (
    
    <div className=' h-screen bg-slate-900'>
    <BrowserRouter >
      <Routes>
        <Route path="/" element={<Landing/>} /> 
        <Route path="/game" element={<Game/>} /> 
      </Routes>
    </BrowserRouter>
    
    </div>
    
    
    
  )
}

export default hello