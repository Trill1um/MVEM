import React, { useEffect, useRef, useState } from "react";
import { useSocketStore } from "../utils/data.utils.js";

import { Line } from 'react-chartjs-2';
import {
	Chart,
	LineElement,
	CategoryScale,
	LinearScale,
	PointElement,
	Tooltip,
	Legend,
	Filler
} from 'chart.js';

Chart.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);


const variableConfig = {
	temperature: { label: 'Temperature', unit: '°C', color: '#f87171', min: 0, max: 50 },
	humidity: { label: 'Humidity', unit: '%', color: '#60a5fa', min: 0, max: 100 },
	airQuality: { label: 'Air Quality', unit: 'ppm', color: '#34d399', min: 0, max: 1000 },
	rzero: { label: 'RZero', unit: '', color: '#a78bfa', min: 0, max: 200 },
};

const sensorKeys = ['temperature', 'humidity', 'airQuality', 'rzero'];

const HomePage = () => {
		// Zustand store state and actions
		const {
			formattedData,
			connectionStatus,
			error,
			connect,
			disconnect,
			clearError
		} = useSocketStore();

		const [selectedGraph, setSelectedGraph] = useState('temperature'); // default to temperature


	// In-memory history for line graphs (last 50 points)
	const historyRef = useRef({
		temperature: [],
		humidity: [],
		airQuality: [],
		rzero: [],
	});
	const [history, setHistory] = useState({
		temperature: [],
		humidity: [],
		airQuality: [],
		rzero: [],
	});

	useEffect(() => {
		connect();
		return () => disconnect();
	}, [connect, disconnect]);

	// Update history on new data, pad with nulls so first point is at the right
	useEffect(() => {
		if (!formattedData) return;
		const newHistory = { ...historyRef.current };
		Object.keys(variableConfig).forEach((key) => {
			const val = formattedData.values[key]?.value;
			const numVal = val !== undefined && val !== null && val !== '' ? parseFloat(val) : null;
			if (numVal !== null && !isNaN(numVal)) {
				let arr = [...(newHistory[key] || []), numVal];
        // last 50 data
				arr = arr.slice(-50);
				if (arr.length < 50) {
					const padLen = 50 - arr.length;
          // 0 to x effect
					if (arr.length === 1) {
						arr = Array(49).fill(null).concat([0]);
					} else {
						arr = Array(padLen).fill(null).concat(arr);
					}
				}
				newHistory[key] = arr;
			}
		});
		historyRef.current = newHistory;
		setHistory({ ...newHistory });
	}, [formattedData]);

	// Connection status indicator
	const getStatusIndicator = () => {
		switch (connectionStatus) {
			case 'connected':
				return <span className="text-green-600">🟢 Connected</span>;
			case 'connecting':
				return <span className="text-yellow-600">🟡 Connecting...</span>;
			case 'disconnected':
				return <span className="text-red-600">🔴 Disconnected</span>;
			case 'error':
				return <span className="text-red-600">❌ Connection Error</span>;
			default:
				return <span className="text-gray-600">⚪ Unknown</span>;
		}
	};

	return (
		<div className="w-full min-h-screen flex flex-col items-center justify-center bg-white font-fredoka">
			{/* Connection Status */}
			<div className="mb-4 px-4 py-2 rounded shadow bg-gray-50">
				{getStatusIndicator()}
			</div>

			{/* Error Display */}
			{error && (
				<div className="mb-4 bg-red-100 border border-red-400 text-red-800 px-4 py-2 rounded shadow">
					<strong>Error:</strong> {error}
					<button
						onClick={clearError}
						className="ml-2 text-red-600 hover:text-red-800"
					>
						×
					</button>
				</div>
			)}

			{/* Data Display */}
			<div className="w-full flex flex-col items-center justify-center py-4">
				{formattedData ? (
					<div className="bg-green-100 border border-green-400 text-green-800 px-6 py-4 rounded shadow max-w-3xl w-full">
						<strong>Live Sensor Dashboard</strong>

						{/* Graph Selector Buttons */}
						<div className="flex flex-wrap gap-2 mt-4 mb-6 justify-center">
							{sensorKeys.map((key) => (
								<button
									key={key}
									className={`px-3 py-1 rounded border font-semibold transition-colors ${selectedGraph === key ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'}`}
									onClick={() => setSelectedGraph(key)}
								>
									{variableConfig[key].label}
								</button>
							))}
							<button
								className={`px-3 py-1 rounded border font-semibold transition-colors ${selectedGraph === 'all' ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100'}`}
								onClick={() => setSelectedGraph('all')}
							>
								All Sensors
							</button>
						</div>

						{/* Single Sensor Graph */}
						{selectedGraph !== 'all' && (
							<div className="bg-white border border-gray-200 rounded p-3 shadow w-full">
								<div className="flex items-center mb-2">
									<span className="font-semibold text-gray-700 mr-2">{variableConfig[selectedGraph].label}</span>
									<span className="text-xs text-gray-500">({variableConfig[selectedGraph].unit})</span>
									<span className="ml-auto text-sm text-gray-500">Current: <span className="font-mono text-green-700">{formattedData.values[selectedGraph]?.value ?? '--'}</span></span>
								</div>
								<Line
									data={{
										labels: history[selectedGraph].map(() => ''),
										datasets: [
											{
												label: variableConfig[selectedGraph].label,
												data: history[selectedGraph],
												borderColor: variableConfig[selectedGraph].color,
												backgroundColor: variableConfig[selectedGraph].color + '33',
												fill: true,
												tension: 0.3,
												pointRadius: 0,
											},
										],
									}}
									options={{
										responsive: true,
										animation: false,
										plugins: {
											legend: { display: false },
											tooltip: { enabled: true },
										},
										scales: {
											x: {
												display: false,
											},
											y: {
												min: variableConfig[selectedGraph].min,
												max: variableConfig[selectedGraph].max,
												ticks: {
													color: variableConfig[selectedGraph].color,
													callback: function(value) {
														// Pad the label to 6 characters wide (adjust as needed)
														return String(value).padStart(6, ' ');
													},
													font: { family: 'monospace', size: 13 },
												},
												grid: { color: '#e5e7eb' },
											},
										},
									}}
									height={80}
								/>
							</div>
						)}

						{/* All Sensors Graph */}
						{selectedGraph === 'all' && (
							<div className="bg-white border border-gray-200 rounded p-3 shadow w-full">
								<div className="flex items-center mb-2">
									<span className="font-semibold text-gray-700 mr-2">All Sensors</span>
								</div>
								<Line
									data={{
										labels: history.temperature.map(() => ''),
										datasets: sensorKeys.map((key) => ({
											label: variableConfig[key].label,
											data: history[key],
											borderColor: variableConfig[key].color,
											backgroundColor: variableConfig[key].color + '33',
											fill: false,
											tension: 0.3,
											pointRadius: 0,
										})),
									}}
									options={{
										responsive: true,
										animation: false,
										plugins: {
											legend: { display: true },
											tooltip: { enabled: true },
										},
										scales: {
											x: {
												display: false,
											},
											y: {
												min: Math.min(...sensorKeys.map(k => variableConfig[k].min)),
												max: Math.max(...sensorKeys.map(k => variableConfig[k].max)),
												ticks: {
													color: '#888',
													callback: function(value) {
														// Pad the label to 6 characters wide (adjust as needed)
														return String(value).padStart(6, ' ');
													},
													font: { family: 'monospace', size: 13 },
												},
												grid: { color: '#e5e7eb' },
											},
										},
									}}
									height={120}
								/>
							</div>
						)}

						{/* Metadata */}
						<div className="mt-4 pt-4 border-t border-green-300 text-sm">
							<div><strong>Device:</strong> {formattedData.metadata.device}</div>
							<div><strong>Last Update:</strong> {formattedData.metadata.timestamp}</div>
						</div>

						{/* Raw Data (for debugging) */}
						<details className="mt-4">
							<summary className="cursor-pointer text-sm text-green-700">Raw Data</summary>
							<pre className="whitespace-pre-wrap break-all text-xs mt-2 bg-green-50 p-2 rounded">
								{JSON.stringify(formattedData, null, 2)}
							</pre>
						</details>
					</div>
				) : (
					<div className="bg-gray-100 border border-gray-300 text-gray-600 px-4 py-2 rounded shadow">
						{connectionStatus === 'connecting' ? 'Connecting to server...' : 'Waiting for live data from server...'}
					</div>
				)}
			</div>
		</div>
	);
};

export default HomePage;