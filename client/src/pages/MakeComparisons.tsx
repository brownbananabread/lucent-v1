import { useState, useEffect } from "react";
import {  CircleDot, CheckCircle2 } from "lucide-react"; //ChevronDown, ChevronRight
import Header from "../components/navigation/Header";
//import { APIProvider, Map as GoogleMap, Marker } from '@vis.gl/react-google-maps';

//const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; 

interface Shaft {
    id: string;
    shaft_id: string;
    depth: number;
    diameter: number;
    grid_connection: boolean;
    latitude: number;
    longitude: number;
}

interface NearbyShafts {
    grid_connection: boolean;
    depth: number;
    diameter: number;
    latitude: number;
    longitude: number;
}

const MakeComparisons = () => {
    const handleRefresh = () => {
        console.log("Refreshing...");
    };

    const helpItems = [
        {
            icon: <CircleDot size={14} />,
            title: "Shaft Comparison",
            description: "Two shafts will be displayed side by side for comparison, select the shaft you deem better"
        }
    ];

    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [shaftA, setShaftA] = useState<Shaft | null>(null);
    const [shaftB, setShaftB] = useState<Shaft | null>(null);
    const [nearbyShaftsA, setNearbyShaftsA] = useState<NearbyShafts[]>([]);
    const [nearbyShaftsB, setNearbyShaftsB] = useState<NearbyShafts[]>([]);

    const fetchPairOfShafts = async () => {
        console.log("Fetching pair of shafts");
        const response = await fetch("/api/v1/schemas/data_analytics/tables/shaft_summary/rows?random=true&limit=2");

        const results = await response.json();
        const data = results.data;

        console.log("Fetched shafts:", data);
        if (data.length < 2) {
            console.error("Not enough shafts to compare.");
            return;
        }

        // Filter the fetched data to match the Shaft interface
        const filteredData = data.map((shaft: any) => {
            return {
                shaft_id: shaft.shaft_id,
                depth: shaft.depth,
                diameter: shaft.diameter,
                grid_connection: shaft.grid_connection,
                latitude: shaft.latitude,
                longitude: shaft.longitude,
            };
        });

        setShaftA(filteredData[0]);
        setShaftB(filteredData[1]);

        // Fetch nearby shafts for both Shaft A and Shaft B
        const nearbyResponseA = await fetch(`/api/v1/schemas/data_analytics/tables/shaft_summary/nearby?latitude=${data[0].latitude}&longitude=${data[0].longitude}&radius_m=5000`);
        const nearbyResponseB = await fetch(`/api/v1/schemas/data_analytics/tables/shaft_summary/nearby?latitude=${data[1].latitude}&longitude=${data[1].longitude}&radius_m=5000`);

        const nearbyDataA = await nearbyResponseA.json();
        const nearbyDataB = await nearbyResponseB.json();
        console.log("Fetched nearby shafts A:", nearbyDataA.data);
        console.log("Fetched nearby shafts B:", nearbyDataB.data);

        setNearbyShaftsA(nearbyDataA.data);
        setNearbyShaftsB(nearbyDataB.data);
    }

    useEffect(() => {
        fetchPairOfShafts();
    }, []);

    const submit = async () => {
        if (!selected) {
            alert("Please select a response first.");
            return;
        }
        setLoading(true);
        const payload = {
            w_id: shaftA?.shaft_id === selected ? shaftA.shaft_id : shaftB?.shaft_id,
            l_id: shaftA?.shaft_id === selected ? shaftB?.shaft_id : shaftA?.shaft_id
        };

        console.log("Submitting payload:", payload);

        try {
            const response = await fetch("/api/v1/schemas/data_clean/tables/fact_pairwise_comparisons/insert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errData.message}`);
            }

            const data = await response.json();
            console.log("Submission successful:", data);
        } catch (error) {
            console.error("Error submitting data:", error);
        } finally {
            fetchPairOfShafts();
            setSelected(null);
            setLoading(false);
        }
    }

    /*
    // Function to render the map for a given shaft and its nearby shafts
    const renderMap = (shaft: Shaft, nearbyShafts: NearbyShafts[]) => {
        const center = {
            lat: shaft.latitude,
            lng: shaft.longitude,
        };
        console.log("Rendering map for shaft:", shaft.shaft_id, "APIKEY:", API_KEY);

        return (
            <div className="map-container">
                <APIProvider apiKey={API_KEY}>
                    <GoogleMap
                        style={{ width: '100%', height: '400px' }}
                        zoom={10}
                        center={center}
                        disableDefaultUI={true}
                    >
                        <Marker position={center} title={shaft.shaft_id} />
                        {nearbyShafts.map((nearbyShaft) => (
                            <Marker
                                key={nearbyShaft.latitude + nearbyShaft.longitude}
                                position={{
                                    lat: nearbyShaft.latitude,
                                    lng: nearbyShaft.longitude,
                                }}
                                title={'shaft'}
                            />
                        ))}
                    </GoogleMap>
                </APIProvider>
            </div>
        );
    };*/

    return (
        <div>
            <Header
                title="Make Comparisons"
                description="Create a labeled dataset to train machine learning models"
                helpCircleItems={helpItems}
                showRefresh={true}
                onRefresh={handleRefresh}
            />
            <div className="flex flex-col items-center gap-6 p-8 bg-gray-900 min-h-screen text-white">
                <div className="max-w-3xl w-full mx-auto border-2 border-gray-700 border-collapse rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                        <tr className="bg-gray-900 text-left">
                            <th className="p-3">Feature</th>
                            <th onClick={() => setSelected('A')} className="p-3 rounded-u-xl">
                                <span className="inline-flex items-center gap-1">
                                Shaft A {selected === shaftA?.shaft_id && <CheckCircle2 className="text-green-500" size={18} />}
                                </span>
                            </th>
                            <th onClick={() => setSelected('B')} className="p-3 rounded-u-xl">
                                <span className="inline-flex items-center gap-1">
                                Shaft B {selected === shaftB?.shaft_id && <CheckCircle2 className="text-green-500" size={18} />}
                                </span>
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {/* Shaft Features */}
                        {shaftA && shaftB && Object.keys(shaftA).map((key, index)=> (
                            <tr key={key}
                            className={index % 2 === 1 ? "bg-gray-900" : "bg-slate-700"}
                            >
                                <td className="p-3 font-medium capitalize w-40">{key}</td>
                                <td onClick={() => setSelected(shaftA.shaft_id)} className="p-3">
                                    {(shaftA as any)[key] !== null ? String((shaftA as any)[key]) : "not reported"}
                                </td>
                                <td onClick={() => setSelected(shaftB.shaft_id)} className="p-3">
                                    {(shaftB as any)[key] !== null ? String((shaftB as any)[key]) : "not reported"}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                {/* Nearby Shafts Table */}
                <div className="max-w-3xl w-full mx-auto border-2 border-gray-700 border-collapse rounded-xl overflow-hidden mt-6">
                    <h2 className="text-lg font-bold">Nearby Shafts</h2>
                    <table className="w-full">
                        <thead>
                        <tr className="bg-gray-900 text-left">
                            <th className="p-3">Shaft</th>
                            <th className="p-3">Grid Connection</th>
                            <th className="p-3">Depth</th>
                            <th className="p-3">Diameter</th>
                        </tr>
                        </thead>
                        <tbody>
                        {nearbyShaftsA && nearbyShaftsA.map((shaft, index) => (
                            <tr key={index} className={index % 2 === 1 ? "bg-gray-900" : "bg-slate-700"}>
                                <td className="p-3">Shaft A Nearby {index + 1}</td>
                                <td className="p-3">{shaft.grid_connection ? "Yes" : "No"}</td>
                                <td className="p-3">{shaft.depth}</td>
                                <td className="p-3">{shaft.diameter}</td>
                            </tr>
                        ))}
                        {nearbyShaftsB && nearbyShaftsB.map((shaft, index) => (
                            <tr key={index} className={index % 2 === 1 ? "bg-gray-900" : "bg-slate-700"}>
                                <td className="p-3">Shaft B Nearby {index + 1}</td>
                                <td className="p-3">{shaft.grid_connection ? "Yes" : "No"}</td>
                                <td className="p-3">{shaft.depth}</td>
                                <td className="p-3">{shaft.diameter}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>


                {/* Submit button */}
                {selected && (
                    <button
                        onClick={submit}
                        disabled={loading}
                        className={`mt-4 px-4 py-2 rounded-md font-medium bg-green-600 hover:bg-green-700 transition
                        ${loading ? "opacity-50 cursor-not-allowed" : ""}`}>
                        {loading ? "Submitting..." : "Submit Choice"}
                    </button>
                )}
            </div>
        </div>
    );
}

export default MakeComparisons;