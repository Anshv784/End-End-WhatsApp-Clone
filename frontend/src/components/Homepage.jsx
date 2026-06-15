import React, { useEffect } from 'react'
import Layout from './Layout'
import { motion } from 'framer-motion'
import ChatList from '../pages/chat-section/ChatList'
import useChatStore from '../store/chatStore'

export const Homepage = () => {
  const { users, fetchUsers } = useChatStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <Layout>
      <motion.div
        initial={{opacity:0}}
        animate={{opacity:1}}
        transition={{duration:0.5}}
        className='h-full'
      >
        <ChatList contacts={users} />
      </motion.div>
    </Layout>
  )
}
