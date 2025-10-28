import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { getUserFromToken } from '../services/authApi'

type Props = {
  roomName: string
}

export default function SimpleYjs({ roomName }: Props) {
  const [status, setStatus] = useState('disconnected')
  const [clients, setClients] = useState<string[]>([])
  const [messages, setMessages] = useState<string[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    if (!roomName) return

    // Create Y.Doc and connect to websocket server
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(import.meta.env.VITE_VITE_WS_BE_URL || 'ws://localhost:1234', roomName, ydoc)

    // Track connection status
    provider.on('status', (event: any) => {
      setStatus(event.status)
      console.log('[YJS] connection status:', event.status)
    })

    // Awareness (presence)
    const awareness = provider.awareness

    // Get user name from authentication token, fallback to random name
    const user = getUserFromToken()
    const userName = user?.name || `user-${Math.floor(Math.random() * 1000)}`

    awareness.setLocalStateField('user', {
      name: userName,
      email: user?.email || '',
      id: user?.id || ''
    })

    const handleAwarenessChange = () => {
      const states = Array.from(awareness.getStates().values())
      const names = states.map((s: any) => {
        const user = s.user
        if (user?.name) {
          return user.email ? `${user.name} (${user.email})` : user.name
        }
        return 'unknown'
      })
      setClients(names)
    }

    awareness.on('change', handleAwarenessChange)
    handleAwarenessChange()

    // Shared Y.Array for chat messages
    const yArray = ydoc.getArray<string>('shared-chat')

    const updateMessages = () => {
      setMessages(yArray.toArray())
    }
    yArray.observe(updateMessages)

      // Expose for debugging in console
      ; (window as any).ydoc = ydoc

    return () => {
      yArray.unobserve(updateMessages)
      awareness.off('change', handleAwarenessChange)
      provider.destroy()
      ydoc.destroy()
    }
  }, [roomName])

  const handleSend = () => {
    if (!input) return
    const ydoc = (window as any).ydoc as Y.Doc
    const yArray = ydoc.getArray<string>('shared-chat')
    yArray.push([input])
    setInput('')
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: 8,
      padding: 10,
      width: 300,
      color: "black",
      fontSize: 12,
      position: 'absolute',
      top: 20,
      right: 20,
      zIndex: 10000
    }}>
      <div><strong>Yjs Room:</strong> {roomName}</div>
      <div><strong>Status:</strong> {status}</div>
      <div><strong>You:</strong> {getUserFromToken()?.name || 'Guest'}</div>
      <div><strong>Connected Users:</strong></div>
      <ul>{clients.map((c, i) => <li key={i}>{c}</li>)}</ul>

      <div><strong>Messages:</strong></div>
      <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type message..."
        style={{ width: '70%', marginRight: 5 }}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  )
}
