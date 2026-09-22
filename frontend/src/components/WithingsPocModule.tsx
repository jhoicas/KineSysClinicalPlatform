import React, { useState, useEffect } from 'react';

const WithingsPocModule: React.FC = () => {
    const [status, setStatus] = useState<string>("Esperando inicio...");
    const [payload, setPayload] = useState<any>(null);
    const [isPolling, setIsPolling] = useState<boolean>(false);

    const startPocSession = async () => {
        try {
            setStatus("Iniciando sesión POC...");
            const response = await fetch('/api/v1/hardware/withings/poc/start', {
                method: 'POST',
            });
            if (response.ok) {
                setStatus("Esperando pesada de la báscula...");
                setPayload(null);
                setIsPolling(true);
            } else {
                setStatus("Error al iniciar sesión POC");
            }
        } catch (error) {
            console.error("Error starting POC:", error);
            setStatus("Error de conexión");
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isPolling) {
            interval = setInterval(async () => {
                try {
                    const response = await fetch('/api/v1/hardware/withings/poc/data');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.payload && Object.keys(data.payload).length > 0) {
                            setPayload(data.payload);
                            setStatus("¡Datos Recibidos!");
                            setIsPolling(false);
                        } else if (!data.active) {
                            setStatus("Sesión POC inactiva o expirada");
                            setIsPolling(false);
                        }
                    }
                } catch (error) {
                    console.error("Error polling POC data:", error);
                }
            }, 1500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPolling]);

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">POC: Integración Withings</h1>
                <p className="text-gray-500 mt-2">
                    Módulo de prueba aislado para capturar y visualizar el webhook crudo emitido por la báscula inteligente.
                </p>
            </div>

            <div className="flex items-center space-x-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <button
                    onClick={startPocSession}
                    disabled={isPolling}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors shadow-sm ${
                        isPolling 
                            ? "bg-gray-400 cursor-not-allowed" 
                            : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                    }`}
                >
                    {isPolling ? "Sondeando webhook..." : "Iniciar Pesaje de Prueba (POC)"}
                </button>
                <div className="flex-1">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Estado Actual</p>
                    <p className={`text-lg font-bold ${
                        status === "¡Datos Recibidos!" ? "text-green-600" :
                        status === "Esperando pesada de la báscula..." ? "text-amber-500 animate-pulse" :
                        "text-gray-800"
                    }`}>
                        {status}
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Payload Crudo (JSON)
                </h2>
                
                {payload ? (
                    <pre className="bg-slate-950 text-green-400 p-6 rounded-xl font-mono text-sm overflow-auto max-h-[500px] shadow-inner">
                        {JSON.stringify(payload, null, 2)}
                    </pre>
                ) : (
                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-gray-500 font-medium">Aún no hay datos capturados</p>
                        <p className="text-sm text-gray-400 mt-1">Presiona "Iniciar Pesaje" y súbete a la báscula</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WithingsPocModule;
