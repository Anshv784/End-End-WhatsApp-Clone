import React, { useEffect, useState } from 'react'
import Layout from './Layout'
import { motion } from 'framer-motion'
import ChatList from '../pages/chat-section/ChatList'
import { getAllUsers } from '../services/user.service'
import useLayoutStore from '../store/layoutStore'

export const Homepage = () => {

  const [allUsers , setAllUsers] = useState([]);

  const getAllUser = async() => {
    try {
      const result = await getAllUsers();
      if(result.status === 'success'){
        setAllUsers(result.data);
      }
    }catch (e) {
      console.log(e);
    }
  }

  useEffect(()=>{
    getAllUser();
  },[])

  console.log(allUsers)
  return (
    <Layout>
      <motion.div
        initial={{opacity:0}}
        animate={{opacity:1}}
        transition={{duration:0.5}}
        className='h-full'
      >
        <ChatList contacts={allUsers} />
      </motion.div>
    </Layout>
  )
}
