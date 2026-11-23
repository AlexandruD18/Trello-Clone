import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { impostaSocketId } from '../lib/api';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    // Quante volte il socket si è riconnesso: chi mostra dati in tempo reale li ricarica.
    const [riconnessioni, setRiconnessioni] = useState(0);
    const giaConnesso = useRef(false);
    // Board aperta in questo momento: si riapre a ogni (ri)connessione.
    const boardCorrente = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return undefined;

        const newSocket = io(window.location.origin, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        newSocket.on('connect', () => {
            setConnected(true);
            if (giaConnesso.current) setRiconnessioni((n) => n + 1);
            giaConnesso.current = true;
            impostaSocketId(newSocket.id);
            if (boardCorrente.current) {
                newSocket.emit('join-board', boardCorrente.current);
            }
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
            impostaSocketId(null);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        setSocket(newSocket);

        return () => {
            impostaSocketId(null);
            newSocket.close();
        };
    }, []);

    const joinBoard = useCallback(
        (boardId) => {
            boardCorrente.current = boardId;
            if (socket && socket.connected) {
                socket.emit('join-board', boardId);
            }
        },
        [socket]
    );

    const leaveBoard = useCallback(
        (boardId) => {
            if (boardCorrente.current === boardId) boardCorrente.current = null;
            if (socket && socket.connected) {
                socket.emit('leave-board', boardId);
            }
        },
        [socket]
    );

    return (
        <SocketContext.Provider value={{ socket, connected, riconnessioni, joinBoard, leaveBoard }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
