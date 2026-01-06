import { useEffect, useRef } from 'react';

/**
 * Hook para ejecutar una función periódicamente
 * @param callback Función a ejecutar
 * @param delay Tiempo en milisegundos (null para pausar)
 */
export function usePolling(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback);

    // Recordar el último callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Configurar el intervalo
    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}
