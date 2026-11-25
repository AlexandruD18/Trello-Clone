import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { impostaSocketId } from '../lib/api';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    // Quante volte il socket si è riconnesso: chi mostra dati in tempo reale li ricarica.
    const [riconnessioni, setRiconnessioni] = useState(0);
    const giaConnesso = useRef(false);
    // Board aperta in questo momento: si riapre a ogni (ri)connessione.
    const boardCorrente = useRef(null);
    // Socket attuale letto da join/leave: le funzioni restano stabili tra un render e l'altro
    // e la pulizia di un effetto usa sempre il socket vero, non quello del primo render.
    const socketRef = useRef(null);

    useEffect(() => {
        // Ci si collega solo da autenticati; il cookie di sessione viaggia con la richiesta.
        if (!user) return undefined;

        const newSocket = io(window.location.origin, {
            withCredentials: true,
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

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            impostaSocketId(null);
            socketRef.current = null;
            newSocket.close();
            setSocket(null);
            setConnected(false);
        };
    }, [user?.id]);

    const joinBoard = useCallback((boardId) => {
        boardCorrente.current = boardId;
        const attuale = socketRef.current;
        if (attuale && attuale.connected) {
            attuale.emit('join-board', boardId);
        }
    }, []);

    const leaveBoard = useCallback((boardId) => {
        if (boardCorrente.current === boardId) boardCorrente.current = null;
        const attuale = socketRef.current;
        if (attuale && attuale.connected) {
            attuale.emit('leave-board', boardId);
        }
    }, []);

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
