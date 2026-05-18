import { useState, useEffect, ReactNode, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, Battery as BatteryIcon, Wind, Droplets, X, Sun, Cloud, 
  CloudRain, Thermometer, Search, MoreVertical, Eye, Gauge, Sunrise, Sunset,
  CloudLightning, CloudSnow, CloudFog, Umbrella, MapPin, RotateCcw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useDeviceContext } from '../hooks/useDeviceContext';

import { getTranslation } from '../translations';

interface ForecastHour {
  time: string;
  temp: number;
  condition: string;
}

interface ForecastDay {
  date: string;
  maxTemp: string;
  minTemp: string;
  condition: string;
}

interface WeatherData {
  temp: string;
  condition: string;
  location: string;
  humidity: string;
  wind: string;
  feelsLike: string;
  uvIndex: string;
  visibility: string;
  pressure: string;
  hourly: ForecastHour[];
  daily: ForecastDay[];
  aqi?: number;
  sunrise?: string;
  sunset?: string;
}

export default function MultiUtilityWidget({ isDark = false, language = 'id' }: { isDark?: boolean, language?: string }) {
  const t = getTranslation(language);
  const deviceContext = useDeviceContext();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [savedCity, setSavedCity] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    // Rely on memory only, per "no local host/storage" request
    if (savedCity) {
      fetchWeather(savedCity);
    } else {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const data = await res.json();
            const cityName = data.address.city || data.address.town || data.address.village;
            if (cityName) fetchWeather(cityName);
          } catch (err) {}
        }, () => {});
      }
    }
  }, []);

  async function fetchWeather(city: string) {
    setIsSearching(true);
    // Only show full loading if we don't have cached data
    if (!weather) setIsLoading(true);
    
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

    try {
      if (apiKey) {
        // Use OpenWeather API (Supports the key from OpenWeather dashboard)
        // 1. Get Geocoding
        const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
        if (!geoRes.ok) throw new Error("Geocoding failed");
        const geoData = await geoRes.json();
        
        if (!geoData || geoData.length === 0) {
          alert("Kota tidak ditemukan.");
          return;
        }

        const { lat, lon, name } = geoData[0];

        // 2. Get Weather Data (Current + Forecast)
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=${language === 'id' ? 'id' : 'en'}&appid=${apiKey}`);
        if (!weatherRes.ok) throw new Error("Weather fetch failed");
        const data = await weatherRes.json();

        // 3. Get Air Pollution Data
        const airRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`);
        let aqiValue = 0;
        let pm25Value = 0;
        if (airRes.ok) {
          const airData = await airRes.json();
          if (airData.list && airData.list[0]) {
            pm25Value = airData.list[0].components.pm2_5;
            // Try to approximate US AQI from PM2.5 for better familiarity (0-500 scale)
            if (pm25Value <= 12) aqiValue = Math.round((50 / 12) * pm25Value);
            else if (pm25Value <= 35.4) aqiValue = Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25Value - 12.1) + 51);
            else if (pm25Value <= 55.4) aqiValue = Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25Value - 35.5) + 101);
            else aqiValue = Math.round(pm25Value * 1.5); // Rough fallback
          }
        }

        const current = data.list[0];
        const now = Date.now();

        const newWeather: WeatherData & { timestamp: number } = {
          temp: Math.round(current.main.temp).toString(),
          condition: current.weather[0].description,
          location: name,
          humidity: current.main.humidity.toString(),
          wind: Math.round(current.wind.speed * 3.6).toString(), // m/s to km/h
          feelsLike: Math.round(current.main.feels_like).toString(),
          uvIndex: "N/A", // Standard OpenWeather API doesn't include UV in forecast
          visibility: (current.visibility / 1000).toString(),
          pressure: current.main.pressure.toString(),
          aqi: aqiValue,
          sunrise: new Date(data.city.sunrise * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          sunset: new Date(data.city.sunset * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          timestamp: now,
          daily: data.list.filter((_: any, i: number) => i % 8 === 0).map((day: any) => ({
            date: new Date(day.dt * 1000).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: '2-digit' }),
            maxTemp: Math.round(day.main.temp_max).toString(),
            minTemp: Math.round(day.main.temp_min).toString(),
            condition: day.weather[0].description
          })),
          hourly: data.list.slice(0, 12).map((hour: any) => ({
            time: new Date(hour.dt * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            temp: Math.round(hour.main.temp),
            condition: hour.weather[0].description
          }))
        };

        setWeather(newWeather);
        setSavedCity(name);
        setLastUpdated(new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        setShowSearch(false);
      } else {
        // Fallback to Open-Meteo
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
        const geoData = await geoRes.json();
        
        if (!geoData || geoData.length === 0) {
          alert("Kota tidak ditemukan. Pastikan nama kota benar.");
          return;
        }

        const { lat, lon, display_name } = geoData[0];
        const cityShortName = display_name.split(',')[0];

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,surface_pressure,wind_speed_10m,uv_index&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`);
        const data = await weatherRes.json();

        const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`);
        const aqiData = await aqiRes.json();

        const current = data.current;
        const codes: Record<number, string> = { 
          0: 'Cerah', 1: 'Cerah Berawan', 2: 'Sebagian Berawan', 3: 'Mendung', 
          45: 'Berkabut', 48: 'Kabut Berembun', 51: 'Gerimis Ringan', 53: 'Gerimis Sedang', 
          55: 'Gerimis Lebat', 61: 'Hujan Ringan', 63: 'Hujan Sedang', 65: 'Hujan Lebat',
          71: 'Salju Ringan', 73: 'Salju Sedang', 75: 'Salju Lebat', 80: 'Hujan Shower Ringan',
          81: 'Hujan Shower Sedang', 82: 'Hujan Shower Sangat Lebat', 95: 'Badai Petir',
          96: 'Badai Petir Ringan', 99: 'Badai Petir Lebat'
        };

        const now = Date.now();
        const newWeather: WeatherData & { timestamp: number } = {
          temp: Math.round(current.temperature_2m).toString(),
          condition: codes[current.weather_code] || "Berawan",
          location: cityShortName,
          humidity: current.relative_humidity_2m.toString(),
          wind: Math.round(current.wind_speed_10m).toString(),
          feelsLike: Math.round(current.apparent_temperature).toString(),
          uvIndex: Math.round(current.uv_index).toString(),
          visibility: "10", 
          pressure: Math.round(current.pressure_msl).toString(),
          aqi: aqiData.current.us_aqi,
          sunrise: data.daily.sunrise[0].split('T')[1],
          sunset: data.daily.sunset[0].split('T')[1],
          timestamp: now,
          daily: data.daily.time.map((dateStr: string, i: number) => ({
            date: new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: '2-digit' }),
            maxTemp: Math.round(data.daily.temperature_2m_max[i]).toString(),
            minTemp: Math.round(data.daily.temperature_2m_min[i]).toString(),
            condition: codes[data.daily.weather_code[i]] || "Berawan"
          })),
          hourly: data.hourly.time.slice(0, 24).map((timeStr: string, i: number) => ({
            time: timeStr.split('T')[1],
            temp: Math.round(data.hourly.temperature_2m[i]),
            condition: codes[data.hourly.weather_code[i]] || "Berawan"
          }))
        };

        setWeather(newWeather);
        setSavedCity(cityShortName);
        setLastUpdated(new Date(now).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        setShowSearch(false);
      }
    } catch (e) {
      console.warn("Maria: Weather fetch failed", e);
      alert("Gagal memuat cuaca. Periksa koneksi atau API Key Anda.");
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) fetchWeather(searchValue.trim());
  };

  const clearCity = () => {
    setSavedCity(null);
    setWeather(null);
  };

  const currentLevel = deviceContext.battery;

  if (isLoading) {
    return (
        <div className={`w-full flex items-center gap-4 px-3 py-4 border rounded-2xl animate-pulse ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'
        }`}>
            <div className={`p-2.5 rounded-xl w-12 h-12 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className="flex-1 space-y-2">
                <div className={`h-4 rounded w-2/3 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <div className={`h-3 rounded w-1/2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
            </div>
        </div>
    );
  }

  const WeatherIcon = ({ condition, size = 20, className = "" }: { condition: string; size?: number; className?: string }) => {
    const c = condition.toLowerCase();
    if (c.includes('badai')) return <CloudLightning size={size} className={`text-brand-blue ${className}`} />;
    if (c.includes('hujan')) return <CloudRain size={size} className={`text-brand-blue ${className}`} />;
    if (c.includes('gerimis')) return <Umbrella size={size} className={`text-brand-blue ${className}`} />;
    if (c.includes('salju')) return <CloudSnow size={size} className={`text-slate-400 ${className}`} />;
    if (c.includes('kabut')) return <CloudFog size={size} className={`text-slate-400 ${className}`} />;
    if (c.includes('berawan') || c.includes('mendung')) return <Cloud size={size} className={`text-slate-400 ${className}`} />;
    if (c.includes('cerah') || c.includes('clear')) return <Sun size={size} className={`text-brand-blue ${className}`} />;
    return <Cloud size={size} className={`text-slate-400 ${className}`} />;
  };

  return (
    <>
      <div className="px-1">
        {savedCity && weather ? (
          <button 
            onClick={() => setShowDetails(true)}
            className={`w-full flex items-center gap-4 px-3 py-4 border hover:border-brand-blue/30 rounded-2xl transition-all active:scale-95 group shadow-sm hover:shadow-md ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
            }`}
          >
            <div className={`p-2.5 rounded-xl border group-hover:bg-brand-blue transition-colors ${
              isDark ? 'bg-brand-blue/10 border-brand-blue/20' : 'bg-brand-blue/5 border-brand-blue/10'
            }`}>
              <WeatherIcon condition={weather?.condition || 'clear'} size={24} className="group-hover:text-white" />
            </div>
            <div className="flex flex-col items-start min-w-0 text-left">
               <span className={`text-[12px] font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.weatherAt} {savedCity}</span>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[11px] font-black ${isDark ? 'text-blue-400' : 'text-brand-blue'}`}>{weather.temp}°C</span>
                  <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
                  <span className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-widest">{weather.condition}</span>
               </div>
               <div className={`flex items-center gap-3 mt-1.5 text-[9px] font-bold uppercase tracking-[0.15em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                 <div className="flex items-center gap-1"><Cloud size={10} /> Weather Updates</div>
               </div>
            </div>
          </button>
        ) : (
          <button 
            onClick={() => setShowSearch(true)}
            className={`w-full flex items-center gap-4 px-4 py-4 border border-dashed rounded-2xl transition-all active:scale-95 group text-slate-400 hover:text-brand-blue ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}
          >
            <div className={`p-2 rounded-lg shadow-sm border transition-all ${
              isDark ? 'bg-slate-900 border-slate-800 group-hover:border-brand-blue/30' : 'bg-white border-slate-100 group-hover:border-brand-blue/30'
            }`}>
                <Sun size={20} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider">{t.addCity}</span>
          </button>
        )}
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setShowSearch(false)}
               className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
             />
             <motion.div 
               initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
               className={`w-full max-w-sm border p-8 rounded-[32px] relative z-10 shadow-2xl space-y-6 ${
                 isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
               }`}
             >
                <div className="flex justify-between items-center">
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.addCity}</h3>
                  <button onClick={() => setShowSearch(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}><X size={20} className="text-slate-400" /></button>
                </div>
                <form onSubmit={handleSearch} className="relative">
                   <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Cari Kota..."
                            className={`w-full border rounded-2xl pl-12 pr-4 py-4 outline-none ring-brand-blue/10 focus:ring-4 focus:border-brand-blue transition-all ${
                              isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-400'
                            }`}
                            autoFocus
                        />
                   </div>
                   <button 
                     type="submit"
                     disabled={isSearching}
                     className="w-full mt-4 bg-brand-blue text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-blue/20 hover:bg-blue-600 transition-all disabled:opacity-50"
                   >
                     {isSearching ? 'Mencari...' : 'Lihat Cuaca'}
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Weather Display Modal */}
      <AnimatePresence>
        {showDetails && weather && (
          <div className={`fixed inset-0 z-[100] overflow-y-auto custom-scrollbar transition-colors duration-500 ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
            <div className="min-h-screen flex flex-col p-6 max-w-2xl mx-auto space-y-12 relative pb-20">
              
              {/* Navigation */}
              <div className={`flex items-center justify-between backdrop-blur sticky top-0 py-4 z-20 transition-colors ${isDark ? 'bg-slate-950/80 border-b border-slate-900' : 'bg-white/80 border-b border-slate-50'}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}><MapPin size={20} className="text-brand-blue" /></div>
                    <h1 className="text-xl font-bold tracking-tight">{weather.location}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => weather && fetchWeather(weather.location)} className={`p-3 rounded-xl transition-all ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-400'} hover:text-brand-blue ${isSearching ? 'animate-spin' : ''}`}><RotateCcw size={20} /></button>
                  <button onClick={() => setShowSearch(true)} className={`p-3 rounded-xl transition-all ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-500' : 'bg-slate-50 hover:bg-slate-100 text-slate-400'} hover:text-brand-blue`}><Search size={20} /></button>
                  <button onClick={clearCity} className={`p-3 rounded-xl transition-all ${isDark ? 'bg-slate-900 hover:bg-red-500/10 text-slate-500 hover:text-red-400' : 'bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500'}`}><MoreVertical size={20} /></button>
                  <button onClick={() => setShowDetails(false)} className="p-3 bg-slate-900 text-white hover:bg-brand-blue rounded-xl transition-all shadow-lg active:scale-95"><X size={20} /></button>
                </div>
              </div>

              {/* Central Weather Info */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center justify-center space-y-6 pt-10"
              >
                  <div className="relative group text-center">
                    <div className={`absolute inset-0 blur-[100px] rounded-full ${isDark ? 'bg-brand-blue/10' : 'bg-brand-blue/5'}`} />
                    <div className={`relative text-[120px] font-black leading-none tracking-tighter flex items-center justify-center select-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {weather.temp}<span className="text-3xl mt-12 font-bold opacity-30">°C</span>
                    </div>
                  </div>
                  
                  <div className={`px-6 py-3 border rounded-2xl flex items-center gap-3 ${isDark ? 'bg-brand-blue/10 border-brand-blue/20' : 'bg-brand-blue/5 border-brand-blue/10'}`}>
                    <WeatherIcon condition={weather.condition} size={28} />
                    <span className="text-lg font-bold text-brand-blue">{weather.condition}</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <div className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t.upcomingForecast}
                    </div>
                    {lastUpdated && (
                      <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
                        {t.lastUpdated}: {lastUpdated}
                      </div>
                    )}
                  </div>
              </motion.div>

              {/* Grid Layout for details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-10">
                {/* 24 Hour Graph */}
                <div className={`border rounded-[32px] p-6 space-y-6 md:col-span-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
                   <div className="flex items-center justify-between">
                     <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                       <Clock size={16} className="text-brand-blue" /> Ramalan 24 Jam
                     </div>
                   </div>
                   <div className="w-full h-56 pt-2 min-h-[224px]">
                     <ResponsiveContainer width="100%" height="100%" debounce={10} minWidth={0} minHeight={0}>
                       <AreaChart data={weather.hourly}>
                         <defs>
                           <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#0984e3" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#0984e3" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <Area 
                           type="monotone" 
                           dataKey="temp" 
                           stroke="#0984e3" 
                           strokeWidth={4}
                           dot={false}
                           fillOpacity={1} 
                           fill="url(#colorTemp)" 
                         />
                         <XAxis 
                           dataKey="time" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: isDark ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: 700 }}
                           interval={3}
                         />
                         <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                         <Tooltip 
                           contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', border: 'none', borderRadius: '16px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                           itemStyle={{ color: '#0984e3', fontSize: '14px', fontWeight: 800 }}
                         />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <DetailCard isDark={isDark} icon={<Thermometer size={18} />} label={t.feelsLike} value={`${weather.feelsLike}°`} />
                  <DetailCard isDark={isDark} icon={<Droplets size={18} />} label={t.humidity} value={`${weather.humidity}%`} />
                  <DetailCard isDark={isDark} icon={<Wind size={18} />} label={t.wind} value={`${weather.wind}`} sub="km/h" />
                  <DetailCard isDark={isDark} icon={<Eye size={18} />} label={t.visibility} value={`${weather.visibility} km`} />
                </div>

                {/* AQI & Sun */}
                <div className="space-y-4">
                    <div className={`rounded-[32px] p-6 flex flex-col justify-between min-h-[160px] ${isDark ? 'bg-slate-900' : 'bg-slate-900'} text-white`}>
                        <div className="text-xs font-bold opacity-40 uppercase tracking-widest">{t.aqi}</div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-4xl font-black">{weather.aqi || '--'}</div>
                                <div className={`text-xs font-bold uppercase mt-1 ${
                                    (weather.aqi || 0) <= 50 ? 'text-green-400' :
                                    (weather.aqi || 0) <= 100 ? 'text-yellow-400' :
                                    (weather.aqi || 0) <= 150 ? 'text-orange-400' :
                                    'text-red-400'
                                }`}>
                                    {(weather.aqi || 0) <= 50 ? 'Sangat Baik' :
                                     (weather.aqi || 0) <= 100 ? 'Sedang' :
                                     (weather.aqi || 0) <= 150 ? 'Tidak Sehat' :
                                     'Sangat Buruk'}
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-[10px] font-bold ${
                                (weather.aqi || 0) <= 50 ? 'border-green-400/20 border-t-green-400' :
                                (weather.aqi || 0) <= 100 ? 'border-yellow-400/20 border-t-yellow-400' :
                                'border-red-400/20 border-t-red-400'
                            }`}>AQI</div>
                        </div>
                    </div>
                    <div className={`border rounded-[32px] p-6 flex justify-between items-center min-h-[80px] ${
                      isDark ? 'bg-brand-blue/10 border-brand-blue/20' : 'bg-brand-blue/5 border-brand-blue/10'
                    }`}>
                        <div className="flex flex-col items-center space-y-1">
                            <Sunrise size={18} className="text-brand-blue" />
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{weather.sunrise}</span>
                        </div>
                        <div className="w-px h-8 bg-brand-blue/10" />
                        <div className="flex flex-col items-center space-y-1">
                            <Sunset size={18} className="text-brand-blue" />
                            <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{weather.sunset}</span>
                        </div>
                    </div>
                </div>
              </div>

              {/* 7 Days List */}
              <div className={`border rounded-[32px] p-8 space-y-8 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className={`text-xs font-bold uppercase tracking-widest flex items-center justify-between ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <div className="flex items-center gap-2"><CalendarActive size={16} /> {t.upcomingForecast}</div>
                    <span className="text-[10px] opacity-60">7 {language === 'en' ? 'Days' : 'Hari'}</span>
                  </div>
                  <div className="space-y-6">
                    {weather.daily.map((day, i) => {
                      const minAll = Math.min(...weather.daily.map(d => parseInt(d.minTemp)));
                      const maxAll = Math.max(...weather.daily.map(d => parseInt(d.maxTemp)));
                      const range = maxAll - minAll || 1;
                      const left = ((parseInt(day.minTemp) - minAll) / range) * 100;
                      const width = ((parseInt(day.maxTemp) - parseInt(day.minTemp)) / range) * 100;

                      return (
                        <div key={i} className="flex items-center justify-between group">
                          <div className={`w-24 text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{i === 0 ? 'Hari ini' : day.date}</div>
                          <div className="flex-1 flex justify-center">
                              <WeatherIcon condition={day.condition} size={24} className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                          </div>
                          <div className="flex items-center gap-6 min-w-[140px] justify-end">
                            <span className={`text-[11px] font-bold w-8 text-right ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{day.minTemp}°</span>
                            <div className={`flex-1 h-1.5 w-20 rounded-full relative overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                               <div 
                                 className="absolute h-full bg-gradient-to-r from-blue-300 to-brand-blue rounded-full" 
                                 style={{ left: `${left}%`, width: `${Math.max(width, 10)}%` }}
                               />
                            </div>
                            <span className={`text-[11px] font-bold w-8 text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{day.maxTemp}°</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </div>

              <div className="text-center pt-10 space-y-2">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>Data Source: Open-Meteo Meteorological Service</p>
                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] block ${isDark ? 'text-slate-800' : 'text-slate-200'}`}>AI INTELLIGENCE WEATHER SERVICE</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailCard({ icon, label, value, sub, isDark = false }: { icon: ReactNode, label: string, value: string, sub?: string, isDark?: boolean }) {
  return (
    <div className={`border rounded-2xl p-5 flex flex-col justify-between min-h-[110px] shadow-sm hover:shadow-md transition-all group ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
    }`}>
      <div className={`p-2 rounded-xl w-fit group-hover:bg-brand-blue group-hover:text-white transition-colors ${
        isDark ? 'bg-slate-800' : 'bg-slate-50'
      }`}>{icon}</div>
      <div>
        <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}{sub && <span className="text-xs ml-1 opacity-20 font-bold">{sub}</span>}</div>
        <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{label}</div>
      </div>
    </div>
  );
}

function CalendarActive({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-blue">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
    );
}
