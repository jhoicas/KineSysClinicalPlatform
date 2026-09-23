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

    const parsed = payload?.parsed_metrics || {};
    const hasSegmental = Boolean(
        parsed.muscle_mass_left_arm_kg ||
        parsed.muscle_mass_right_arm_kg ||
        parsed.muscle_mass_trunk_kg ||
        parsed.muscle_mass_left_leg_kg ||
        parsed.muscle_mass_right_leg_kg ||
        parsed.fat_mass_left_arm_kg ||
        parsed.fat_mass_right_arm_kg ||
        parsed.fat_mass_trunk_kg ||
        parsed.fat_mass_left_leg_kg ||
        parsed.fat_mass_right_leg_kg
    );

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">POC: Integración Withings Body Scan</h1>
                <p className="text-gray-500 mt-2">
                    Módulo de prueba aislado para capturar y verificar en tiempo real las mediciones corporales y el análisis segmental (extremidades y torso) emitidos por la báscula.
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

            {payload && parsed && Object.keys(parsed).length > 0 && (
                <>
                    {/* Tarjeta de Métricas Generales */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            <span className="material-symbols-outlined mr-2 text-blue-600">monitor_weight</span>
                            Métricas Generales de Cuerpo Entero
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Peso Corporal</span>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {parsed.weight_kg ? `${parsed.weight_kg} kg` : '--'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Grasa Corporal</span>
                                <p className="text-2xl font-bold text-amber-600 mt-1">
                                    {parsed.fat_ratio_percent ? `${parsed.fat_ratio_percent}%` : '--'}
                                </p>
                                <span className="text-xs text-gray-400">{parsed.fat_mass_kg ? `${parsed.fat_mass_kg} kg` : ''}</span>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Masa Muscular</span>
                                <p className="text-2xl font-bold text-blue-600 mt-1">
                                    {parsed.muscle_mass_kg ? `${parsed.muscle_mass_kg} kg` : '--'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Agua Corporal</span>
                                <p className="text-2xl font-bold text-cyan-600 mt-1">
                                    {parsed.hydration_kg ? `${parsed.hydration_kg} kg` : '--'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Masa Ósea</span>
                                <p className="text-2xl font-bold text-gray-700 mt-1">
                                    {parsed.bone_mass_kg ? `${parsed.bone_mass_kg} kg` : '--'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Proteína (Derivada)</span>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">
                                    {parsed.protein_kg ? `${parsed.protein_kg} kg` : '--'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Grasa Visceral</span>
                                <p className="text-2xl font-bold text-purple-600 mt-1">
                                    {parsed.visceral_fat_index ? `Nivel ${parsed.visceral_fat_index}` : '--'}
                                </p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-xs text-gray-500 font-medium">Pulso / Frecuencia</span>
                                <p className="text-2xl font-bold text-rose-600 mt-1">
                                    {parsed.heart_rate_bpm ? `${parsed.heart_rate_bpm} bpm` : '--'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta de Análisis Segmental */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                <span className="material-symbols-outlined mr-2 text-indigo-600">accessibility_new</span>
                                Análisis Segmental (Withings Body Scan)
                            </h2>
                            {hasSegmental ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                    ✓ Mango Retráctil Detectado
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    ⚠️ No se detectaron segmentos (Sujeta la barra durante el pesaje)
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {/* Brazo Izquierdo */}
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Brazo Izquierdo</div>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Músculo</span>
                                        <span className="text-lg font-bold text-blue-700">
                                            {parsed.muscle_mass_left_arm_kg ? `${parsed.muscle_mass_left_arm_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Grasa</span>
                                        <span className="text-lg font-bold text-amber-600">
                                            {parsed.fat_mass_left_arm_kg ? `${parsed.fat_mass_left_arm_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tronco */}
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Tronco / Torso</div>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Músculo</span>
                                        <span className="text-lg font-bold text-blue-700">
                                            {parsed.muscle_mass_trunk_kg ? `${parsed.muscle_mass_trunk_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Grasa</span>
                                        <span className="text-lg font-bold text-amber-600">
                                            {parsed.fat_mass_trunk_kg ? `${parsed.fat_mass_trunk_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Brazo Derecho */}
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Brazo Derecho</div>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Músculo</span>
                                        <span className="text-lg font-bold text-blue-700">
                                            {parsed.muscle_mass_right_arm_kg ? `${parsed.muscle_mass_right_arm_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Grasa</span>
                                        <span className="text-lg font-bold text-amber-600">
                                            {parsed.fat_mass_right_arm_kg ? `${parsed.fat_mass_right_arm_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pierna Izquierda */}
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Pierna Izquierda</div>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Músculo</span>
                                        <span className="text-lg font-bold text-blue-700">
                                            {parsed.muscle_mass_left_leg_kg ? `${parsed.muscle_mass_left_leg_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Grasa</span>
                                        <span className="text-lg font-bold text-amber-600">
                                            {parsed.fat_mass_left_leg_kg ? `${parsed.fat_mass_left_leg_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Pierna Derecha */}
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Pierna Derecha</div>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Músculo</span>
                                        <span className="text-lg font-bold text-blue-700">
                                            {parsed.muscle_mass_right_leg_kg ? `${parsed.muscle_mass_right_leg_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 block">Grasa</span>
                                        <span className="text-lg font-bold text-amber-600">
                                            {parsed.fat_mass_right_leg_kg ? `${parsed.fat_mass_right_leg_kg} kg` : '-- kg'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

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
                        <p className="text-sm text-gray-400 mt-1">Presiona "Iniciar Pesaje de Prueba (POC)" y súbete a la báscula sosteniendo la barra retráctil</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WithingsPocModule;
