import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LocationService } from '../../services/LocationService';

// ─── PARSER GEOGRÁFICO ─────────────────────────────────────────────────────────
function parseGeoPoint(value: any): { lat: number | null; lng: number | null } {
  if (!value) return { lat: null, lng: null };
  try {
    if (typeof value === 'object' && value.coordinates && Array.isArray(value.coordinates))
      return { lng: value.coordinates[0], lat: value.coordinates[1] };
    if (typeof value === 'string') {
      const m = value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
      if (value.length >= 42) {
        const bo = parseInt(value.slice(0, 2), 16);
        const hasSRID = (parseInt(value.slice(2, 10), 16) & 0x20000000) !== 0;
        const off = 10 + (hasSRID ? 8 : 0);
        const f64 = (h: string) => { const b = new ArrayBuffer(8); const v = new DataView(b); for (let i = 0; i < 8; i++) v.setUint8(i, parseInt(h.substr(i*2,2),16)); return v.getFloat64(0, bo===1); };
        const lng = f64(value.slice(off, off+16)), lat = f64(value.slice(off+16, off+32));
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    }
  } catch(_) {}
  return { lat: null, lng: null };
}

// ─── HTML DEL MAPA LEAFLET ─────────────────────────────────────────────────────
const LEAFLET_HTML = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  body{margin:0;padding:0;}#map{height:100vh;width:100vw;}
  .custom-order-icon{background:linear-gradient(135deg,#2563EB,#1E40AF);border:2px solid #1E40AF;border-radius:50%;text-align:center;line-height:28px;font-size:16px;font-weight:bold;color:white;box-shadow:0 3px 6px rgba(37,99,235,.4);}
  .custom-order-icon-sale{background:linear-gradient(135deg,#10B981,#059669);border:2px solid #059669;border-radius:50%;text-align:center;line-height:28px;font-size:16px;font-weight:bold;color:white;box-shadow:0 3px 6px rgba(16,185,129,.4);}
  .custom-order-icon-no-sale{background:linear-gradient(135deg,#F59E0B,#D97706);border:2px solid #D97706;border-radius:50%;text-align:center;line-height:28px;font-size:16px;font-weight:bold;color:white;box-shadow:0 3px 6px rgba(245,158,11,.4);}
  .custom-order-icon-closed{background:linear-gradient(135deg,#EF4444,#DC2626);border:2px solid #DC2626;border-radius:50%;text-align:center;line-height:28px;font-size:16px;font-weight:bold;color:white;box-shadow:0 3px 6px rgba(239,68,68,.4);}
  .employee-marker{background:linear-gradient(135deg,#8B5CF6,#7C3AED);border:3px solid #fff;border-radius:50%;text-align:center;line-height:36px;font-size:14px;font-weight:bold;color:white;box-shadow:0 4px 8px rgba(139,92,246,.5);}
</style></head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false}).setView([-17.3895,-66.1568],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
var markersLayer=L.layerGroup().addTo(map);
var routeLayer=L.layerGroup().addTo(map);
var markersMap={};

function btn(label,color,action){
  return '<button onclick="window.ReactNativeWebView.postMessage(JSON.stringify('+action+'));" style="background:'+color+';color:white;border:none;padding:7px 10px;border-radius:6px;margin-top:6px;font-weight:bold;width:100%;cursor:pointer;font-size:12px">'+label+'</button>';
}

function updateMap(data){
  if(data.type==='UPDATE_DATA'){
    markersLayer.clearLayers(); routeLayer.clearLayers(); markersMap={};

    if(data.routePoints&&data.routePoints.length>0){
      data.routePoints.forEach(function(rp){
        if(!rp.lat||!rp.lng)return;
        var color=rp.color||'#6366F1';
        var icon=L.divIcon({className:'',html:'<div style="background:'+color+';width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.4);font-weight:bold;color:white;font-size:11px;line-height:30px;text-align:center;">'+(rp.label||'•')+'</div>',iconSize:[30,30],iconAnchor:[15,15]});
        var popup='<div style="text-align:center;min-width:160px;font-family:system-ui">';
        popup+='<b style="font-size:13px">'+(rp.label||'Punto de Ruta')+'</b><br>';
        if(rp.clientName) popup+='<span style="color:#2a8c4a;font-size:12px;font-weight:600">👤 '+rp.clientName+'</span><br>';
        if(rp.zoneName)   popup+='<span style="color:#666;font-size:11px">📍 '+rp.zoneName+'</span><br>';
        if(rp.clientId){
          popup+=btn('▶ INICIAR VISITA','#2a8c4a','{action:\\'startVisit\\',clientId:\\''+rp.clientId+'\\'}');
          popup+=btn('✏ Cambiar cliente','#6B7280','{action:\\'assignClient\\',pointId:\\''+rp.pointId+'\\'}');
        }else{
          popup+=btn('👤 ASIGNAR CLIENTE','#6366F1','{action:\\'assignClient\\',pointId:\\''+rp.pointId+'\\'}');
        }
        popup+='</div>';
        var m=L.marker([rp.lat,rp.lng],{icon:icon}).bindPopup(popup);
        routeLayer.addLayer(m);
        markersMap['rp_'+rp.pointId]=m;
      });
    }

    if(data.orders&&data.orders.length>0){
      data.orders.forEach(function(o){
        if(!o.lat||!o.lng)return;
        var iconClass='custom-order-icon',symbol='$',label='Pedido',color='#64c27b';
        if(o.outcome==='sale')   {iconClass='custom-order-icon-sale';   symbol='✓';label='✅ Venta';     color='#10B981';}
        if(o.outcome==='no_sale'){iconClass='custom-order-icon-no-sale';symbol='○';label='⚠️ Sin Venta'; color='#F59E0B';}
        if(o.outcome==='closed') {iconClass='custom-order-icon-closed'; symbol='✕';label='🔒 Cerrado';  color='#EF4444';}
        var icon=L.divIcon({className:iconClass,html:symbol,iconSize:[32,32]});
        var popup='<div style="text-align:center;min-width:150px"><b>'+label+'</b><br>';
        if(o.total>0)popup+='<span style="color:'+color+';font-size:15px;font-weight:bold">Bs. '+o.total.toFixed(2)+'</span><br>';
        popup+='<span style="color:#999;font-size:11px">'+(o.time||'')+'</span><br>';
        var isVisit=o.id.toString().startsWith('visit-');
        var vid=isVisit?o.id.toString().replace('visit-',''):'';
        if(isVisit) popup+=btn('VER DETALLE','#3B82F6','{action:\\'viewVisit\\',visitId:\\''+vid+'\\'}');
        else        popup+=btn('VER DETALLE','#3B82F6','{action:\\'viewOrder\\',orderId:\\''+o.id+'\\'}');
        popup+='</div>';
        L.marker([o.lat,o.lng],{icon:icon}).bindPopup(popup).addTo(markersLayer);
      });
    }

    if(data.employees&&data.employees.length>0){
      data.employees.forEach(function(emp){
        if(!emp.lat||!emp.lng)return;
        var icon=L.divIcon({className:'employee-marker',html:emp.initials,iconSize:[40,40]});
        var popup='<div style="text-align:center"><b>👤 '+emp.name+'</b><br>';
        popup+='<span style="color:#8B5CF6;font-size:12px;font-weight:600">'+emp.role+'</span><br>';
        if(emp.lastUpdate)popup+='<span style="color:#999;font-size:11px">📍 '+emp.lastUpdate+'</span>';
        popup+='</div>';
        L.marker([emp.lat,emp.lng],{icon:icon}).bindPopup(popup).addTo(markersLayer);
      });
    }
  }
  if(data.type==='CENTER_USER'){
    map.setView([data.lat,data.lng],14);
    L.circleMarker([data.lat,data.lng],{radius:8,fillColor:'#64c27b',color:'#fff',weight:2,fillOpacity:.9}).addTo(map);
  }
  if(data.type==='FLY_TO'){
    var m=markersMap[data.id];
    if(m){map.setView(m.getLatLng(),18);setTimeout(function(){m.openPopup();},300);}
  }
  if(data.type==='UPDATE_POINT_POPUP'){
    var mp=markersMap['rp_'+data.pointId];
    if(mp){
      var rp=data;
      var color=rp.color||'#6366F1';
      var newPopup='<div style="text-align:center;min-width:160px;font-family:system-ui">';
      newPopup+='<b style="font-size:13px">'+(rp.label||'Punto de Ruta')+'</b><br>';
      if(rp.clientName) newPopup+='<span style="color:#2a8c4a;font-size:12px;font-weight:600">👤 '+rp.clientName+'</span><br>';
      if(rp.zoneName)   newPopup+='<span style="color:#666;font-size:11px">📍 '+rp.zoneName+'</span><br>';
      if(rp.clientId){
        newPopup+=btn('▶ INICIAR VISITA','#2a8c4a','{action:\\'startVisit\\',clientId:\\''+rp.clientId+'\\'}')
        newPopup+=btn('✏ Cambiar cliente','#6B7280','{action:\\'assignClient\\',pointId:\\''+rp.pointId+'\\'}');
      }else{
        newPopup+=btn('👤 ASIGNAR CLIENTE','#6366F1','{action:\\'assignClient\\',pointId:\\''+rp.pointId+'\\'}');
      }
      newPopup+='</div>';
      mp.setPopupContent(newPopup);
      setTimeout(function(){mp.openPopup();},150);
    }
  }
}
document.addEventListener('message',function(e){try{updateMap(JSON.parse(e.data));}catch(_){}});
window.addEventListener('message',  function(e){try{updateMap(JSON.parse(e.data));}catch(_){}});
</script></body></html>`;

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function LeafletMapScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const webViewRef = useRef<WebView>(null);

  const [searchText,  setSearchText]  = useState('');
  const [clients,     setClients]     = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedZoneId,     setSelectedZoneId]     = useState<string | null>(null);
  const [employees,    setEmployees]    = useState<any[]>([]);
  const [zones,        setZones]        = useState<any[]>([]);
  const [zonasFull,    setZonasFull]    = useState<any[]>([]);
  const [showFilters,  setShowFilters]  = useState(false);
  const [activeFilter, setActiveFilter] = useState<'employee' | 'zone' | null>(null);

  const [assignModal,   setAssignModal]   = useState(false);
  const [assignPointId, setAssignPointId] = useState<string | null>(null);
  const [assignSearch,  setAssignSearch]  = useState('');
  const [assignResults, setAssignResults] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [savingAssign,  setSavingAssign]  = useState(false);

  const [webViewReady, setWebViewReady] = useState(false);

  const sendMessage = useCallback((payload: any) => {
    webViewRef.current?.postMessage(JSON.stringify(payload));
  }, []);

  const loadMapData = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
        sendMessage({ type: 'CENTER_USER', lat: loc?.coords.latitude ?? -17.3895, lng: loc?.coords.longitude ?? -66.1568 });
      }
    } catch (_) {}

    try {
      const { data: clientsData } = await supabase
        .from('clients').select('id, name, code, phones, address, location, zone_name').eq('status', 'Vigente');
      const processedClients = (clientsData || []).map((c: any) => { const { lat, lng } = parseGeoPoint(c.location); return { ...c, lat, lng }; });
      setClients(processedClients);

      const { data: sd } = await supabase.auth.getSession();
      const userId = sd?.session?.user?.id;

      let routeMarkers: any[] = [];
      if (selectedZoneId) {
        // ✅ FIX: vendedor ve todos los puntos de la zona (sin filtrar por vendor_id)
        // porque los puntos de ruta están asignados a la zona, no al vendedor directamente
        const { data: rpData, error: rpError } = await supabase
          .from('route_points')
          .select('id,latitude,longitude,label,color,client_id,zona_id,clients:client_id(name)')
          .eq('zona_id', selectedZoneId);

        if (rpError) console.warn('[route_points] Error:', rpError.message);

        routeMarkers = (rpData || []).map((rp: any) => ({
          lat:        rp.latitude,
          lng:        rp.longitude,
          label:      rp.label || '',
          color:      rp.color || '#6366F1',
          clientId:   rp.client_id,
          clientName: Array.isArray(rp.clients) ? rp.clients[0]?.name : rp.clients?.name,
          zoneName:   zones.find((z: any) => z.id === rp.zona_id)?.codigo_zona || null,
          pointId:    rp.id,
        }));
      }

      const today = new Date().toISOString().split('T')[0];
      let orderMarkers: any[] = [];
      let employeeMarkers: any[] = [];

      if (userId) {
        // ✅ FIX: columna correcta es 'created_at' no 'crated_at'
        let oq = supabase.from('pedidos')
          .select('id,total_venta,created_at,ubicacion_venta,visit_id,visits:visit_id(outcome)')
          .gte('created_at', `${today}T00:00:00`).not('ubicacion_venta','is',null);
        if (!isAdmin) oq = oq.eq('empleado_id', userId);
        else if (selectedEmployeeId) oq = oq.eq('empleado_id', selectedEmployeeId);
        const { data: od } = await oq;
        orderMarkers = (od || []).map((o: any) => {
          const { lat, lng } = parseGeoPoint(o.ubicacion_venta);
          if (!lat || !lng) return null;
          const vd = Array.isArray(o.visits) ? o.visits[0] : o.visits;
          return { id: o.id, lat, lng, total: o.total_venta, outcome: vd?.outcome || null, time: new Date(o.created_at).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}) };
        }).filter(Boolean);

        let vq = supabase.from('visits').select('id,outcome,end_time,check_in_location,check_out_location')
          .gte('end_time', `${today}T00:00:00`)
          .or('check_in_location.not.is.null,check_out_location.not.is.null')
          .neq('outcome','pending');
        if (!isAdmin) vq = vq.eq('seller_id', userId);
        else if (selectedEmployeeId) vq = vq.eq('seller_id', selectedEmployeeId);
        const { data: vd } = await vq;
        const visitIdsWithOrders = (od || []).map((o: any) => o.visit_id).filter(Boolean);
        const visitMarkers = (vd || []).filter((v: any) => !visitIdsWithOrders.includes(v.id)).map((v: any) => {
          const locationToUse = v.check_in_location || v.check_out_location;
          const { lat, lng } = parseGeoPoint(locationToUse);
          if (!lat || !lng) return null;
          return {
            id: `visit-${v.id}`,
            lat, lng,
            total:   0,
            outcome: v.outcome,
            time:    new Date(v.end_time).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })
          };
        }).filter(Boolean);
        orderMarkers = [...orderMarkers, ...visitMarkers];

        if (isAdmin) {
          const { data: ed } = await supabase.from('employees')
            .select('id,full_name,job_title,role,location,updated_at')
            .eq('status','Habilitado').not('location','is',null).neq('id', userId);
          employeeMarkers = (ed || []).map((emp: any) => {
            const { lat, lng } = parseGeoPoint(emp.location);
            if (!lat || !lng) return null;
            const parts = emp.full_name.split(' ');
            const initials = parts.length >= 2 ? parts[0][0]+parts[1][0] : emp.full_name.slice(0,2);
            return { id: emp.id, lat, lng, name: emp.full_name, role: emp.job_title||emp.role||'Empleado', initials: initials.toUpperCase(), lastUpdate: emp.updated_at ? new Date(emp.updated_at).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}) : null };
          }).filter(Boolean);
        }
      }

      sendMessage({ type: 'UPDATE_DATA', clients: processedClients, routePoints: routeMarkers, orders: orderMarkers, employees: employeeMarkers });
    } catch (_) {
      Alert.alert('Error', 'No se pudieron cargar los datos del mapa');
    }
  }, [isAdmin, selectedEmployeeId, selectedZoneId, sendMessage, zones]);

  useEffect(() => {
    if (webViewReady) loadMapData();
  }, [webViewReady, selectedEmployeeId, selectedZoneId]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          await LocationService.enableTracking();
          await LocationService.initialize();
          setIsTrackingEnabled(true);
        }
      } catch (_) {}
    })();
    return () => { LocationService.stopTrackingInterval(); };
  }, []);

  useEffect(() => {
    (async () => {
      const { data: sd } = await supabase.auth.getSession();
      const userId = sd?.session?.user?.id;
      if (!userId) return;

      if (isAdmin) {
        // ✅ FIX: tabla correcta es 'zones' (no 'zonas'), sin filtro 'estado'
        const [{ data: emps }, { data: zns }] = await Promise.all([
          supabase.from('employees').select('id,full_name,job_title').eq('status','Habilitado').order('full_name'),
          supabase.from('zones').select('id,codigo_zona,name,vendedor_id,color_marcador,employees:vendedor_id(id,full_name)').order('codigo_zona'),
        ]);
        if (emps) setEmployees(emps);
        if (zns) {
          setZonasFull(zns);
          setZones(zns);
        }
      } else {
        // ✅ FIX: para vendedor, buscar zonas por vendedor_id en tabla 'zones'
        const { data: myZones } = await supabase
          .from('zones')
          .select('id, codigo_zona, name, color_marcador')
          .eq('vendedor_id', userId)
          .order('codigo_zona');
        setZones(myZones || []);
      }
    })();
  }, [isAdmin]);

  const handleTrackingToggle = async (value: boolean) => {
    if (value) {
      const ok = await LocationService.enableTracking();
      setIsTrackingEnabled(ok);
      if (ok) {
        Alert.alert('✅ Ubicación Activa', 'Tu ruta está siendo registrada.', [{text:'OK'}]);
        centerOnMyLocation();
      }
    } else {
      Alert.alert('⚠️ Desactivar', '¿Confirmas desactivar el tracking?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desactivar', style: 'destructive', onPress: async () => {
          await LocationService.disableTracking('Usuario desactivó desde toggle');
          setIsTrackingEnabled(false);
        }},
      ]);
    }
  };

  const centerOnMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de ubicación para centrar el mapa.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      sendMessage({ type: 'CENTER_USER', lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (_) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación actual.');
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (!text) { setSuggestions([]); return; }
    setSuggestions(clients.filter(c => c.name.toLowerCase().includes(text.toLowerCase()) || (c.code && c.code.toLowerCase().includes(text.toLowerCase()))).slice(0,5));
  };

  const handleSelectClient = (client: any) => {
    setSearchText(client.name); setSuggestions([]); Keyboard.dismiss();
    sendMessage({ type: 'FLY_TO', id: 'rp_'+client.id });
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === 'startVisit' && data.clientId) {
        router.push(`/clients/${data.clientId}?autoStartVisit=true`);
      } else if (data.action === 'viewOrder' && data.orderId) {
        router.push(`/pedidos/${data.orderId}` as any);
      } else if (data.action === 'viewVisit' && data.visitId) {
        router.push(`/visitas/${data.visitId}` as any);
      } else if (data.action === 'assignClient' && data.pointId) {
        setAssignPointId(data.pointId);
        setAssignSearch('');
        setAssignResults([]);
        setAssignModal(true);
      }
    } catch (_) {}
  };

  const searchClientsForAssign = async (text: string) => {
    setAssignSearch(text);
    if (!text || text.length < 2) { setAssignResults([]); return; }
    setAssignLoading(true);
    try {
      const { data } = await supabase.from('clients').select('id,name,code,address')
        .or(`name.ilike.%${text}%,code.ilike.%${text}%`).eq('status','Vigente').limit(10);
      setAssignResults(data || []);
    } finally { setAssignLoading(false); }
  };

  const assignClientToPoint = async (client: any) => {
    if (!assignPointId) return;
    setSavingAssign(true);
    try {
      const { error } = await supabase
        .from('route_points')
        .update({ client_id: client.id })
        .eq('id', assignPointId);
      if (error) throw error;

      // ✅ Actualizar solo el popup del marcador afectado en el mapa
      // sin recargar todo. Buscamos el punto en el estado local para
      // obtener su label, color y nombre de zona.
      const zona = zones.find((z: any) => {
        // El point no tiene zona_id en el estado local actualmente,
        // pero sabemos que selectedZoneId es la zona activa.
        return z.id === selectedZoneId;
      });
      sendMessage({
        type:       'UPDATE_POINT_POPUP',
        pointId:    assignPointId,
        clientId:   client.id,
        clientName: client.name,
        zoneName:   zona?.codigo_zona || null,
        label:      null, // el WebView mantiene el label existente del popup
        color:      null,
      });

      // Cerrar modal y limpiar sin tocar el mapa
      setAssignModal(false);
      setAssignSearch('');
      setAssignResults([]);
      setAssignPointId(null);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo asignar: ' + e.message);
    } finally { setSavingAssign(false); }
  };

  useEffect(() => {
    if (!isAdmin) setActiveFilter('zone');
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (selectedEmployeeId) {
      const filtered = zonasFull.filter((z: any) => {
        const vid = Array.isArray(z.employees) ? z.employees[0]?.id : z.employees?.id;
        return vid === selectedEmployeeId || z.vendedor_id === selectedEmployeeId;
      });
      setZones(filtered);
      if (selectedZoneId && !filtered.find((z: any) => z.id === selectedZoneId)) {
        setSelectedZoneId(null);
      }
    } else {
      setZones(zonasFull);
    }
  }, [selectedEmployeeId, zonasFull, isAdmin]);

  const hasActiveFilter = !!(selectedEmployeeId || selectedZoneId);

  return (
    <View style={styles.container}>

      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        style={styles.map}
        onMessage={handleMessage}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setWebViewReady(true)}
      />

      <View style={styles.topBar}>

        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
          <TextInput placeholder="Buscar cliente..." style={styles.searchInput} value={searchText}
            onChangeText={handleSearch}
            onFocus={() => searchText && setSuggestions(clients.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase())).slice(0,5))} />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); setSuggestions([]); Keyboard.dismiss(); }}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestionsList}>
            <FlatList data={suggestions} keyExtractor={i => i.id} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectClient(item)}>
                  <View style={styles.suggestionAvatar}><Text style={styles.suggestionInitial}>{item.name.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    {item.code && <Text style={styles.suggestionCode}>{item.code}</Text>}
                  </View>
                  <Ionicons name="location-sharp" size={14} color="#2a8c4a" />
                </TouchableOpacity>
              )} />
          </View>
        )}

        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive, !selectedZoneId && styles.filterBtnPulse]}
          onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="map" size={16} color={hasActiveFilter ? '#fff' : '#2a8c4a'} />
          <Text style={[styles.filterBtnText, hasActiveFilter && { color: '#fff' }]}>
            {selectedZoneId
              ? (zones.find(z => z.id === selectedZoneId)?.codigo_zona || 'Zona seleccionada')
              : (isAdmin ? '▾ Seleccionar Zona' : '▾ Elegir mi Ruta')}
          </Text>
          {selectedEmployeeId && !selectedZoneId && (
            <Text style={styles.filterBtnSubText}>
              {'  · ' + (employees.find(e => e.id === selectedEmployeeId)?.full_name?.split(' ')[0] || '')}
            </Text>
          )}
          {hasActiveFilter && (
            <TouchableOpacity
              style={{ marginLeft: 6 }}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedEmployeeId(null);
                setSelectedZoneId(null);
                setZones(zonasFull);
              }}>
              <Ionicons name="close-circle" size={15} color={hasActiveFilter ? '#fff' : '#9CA3AF'} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filtersPanel}>

            {isAdmin && (
              <View style={styles.filterTabs}>
                {(['employee','zone'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                    onPress={() => setActiveFilter(tab)}>
                    <Ionicons
                      name={tab === 'employee' ? 'people' : 'map-outline'}
                      size={13}
                      color={activeFilter === tab ? '#fff' : '#2a8c4a'}
                    />
                    <Text style={[styles.filterTabText, activeFilter === tab && { color: '#fff' }]}>
                      {tab === 'employee' ? 'Por Vendedor' : 'Por Zona'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {isAdmin && activeFilter === 'employee' && (
              <ScrollView style={styles.filterList} nestedScrollEnabled>
                <TouchableOpacity
                  style={[styles.filterItem, !selectedEmployeeId && styles.filterItemSelected]}
                  onPress={() => { setSelectedEmployeeId(null); setZones(zonasFull); setActiveFilter('zone'); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="people-outline" size={15} color={!selectedEmployeeId ? '#166534' : '#6B7280'} />
                    <Text style={[styles.filterItemText, !selectedEmployeeId && { color: '#166534', fontWeight: '700' }]}>
                      Todos los vendedores
                    </Text>
                  </View>
                </TouchableOpacity>
                {employees.map(e => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.filterItem, selectedEmployeeId === e.id && styles.filterItemSelected]}
                    onPress={() => { setSelectedEmployeeId(e.id); setActiveFilter('zone'); }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={styles.filterAvatar}>
                        <Text style={styles.filterAvatarText}>{e.full_name?.charAt(0) || '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.filterItemText, selectedEmployeeId === e.id && { color: '#166534', fontWeight: '700' }]}>
                          {e.full_name}
                        </Text>
                        {e.job_title && <Text style={styles.filterItemSub}>{e.job_title}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {(!isAdmin || activeFilter === 'zone') && (
              <ScrollView style={styles.filterList} nestedScrollEnabled>

                {isAdmin && selectedEmployeeId && (
                  <View style={styles.filterContext}>
                    <Ionicons name="person-circle-outline" size={15} color="#6366F1" />
                    <Text style={styles.filterContextText}>
                      Vendedor: {employees.find(e => e.id === selectedEmployeeId)?.full_name || ''}
                    </Text>
                    <TouchableOpacity onPress={() => setActiveFilter('employee')}>
                      <Text style={styles.filterContextChange}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.filterZoneHeader}>
                  <Ionicons name="map-outline" size={13} color="#9CA3AF" />
                  <Text style={styles.filterZoneHeaderText}>
                    {zones.length === 0
                      ? 'Sin zonas disponibles'
                      : `${zones.length} zona${zones.length !== 1 ? 's' : ''} disponible${zones.length !== 1 ? 's' : ''}`}
                  </Text>
                </View>

                {zones.length === 0 && (
                  <View style={styles.filterEmpty}>
                    <Ionicons name="alert-circle-outline" size={28} color="#E5E7EB" />
                    <Text style={styles.filterEmptyText}>
                      {isAdmin && selectedEmployeeId
                        ? 'Este vendedor no tiene zonas asignadas'
                        : 'No hay zonas asignadas aún'}
                    </Text>
                  </View>
                )}

                {zones.map(z => {
                  const vendorName = Array.isArray(z.employees) ? z.employees[0]?.full_name : z.employees?.full_name;
                  const zoneColor = z.color_marcador || '#6366F1';
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.filterItem, selectedZoneId === z.id && styles.filterItemSelected]}
                      onPress={() => { setSelectedZoneId(z.id); setShowFilters(false); }}>
                      <View style={[styles.filterZoneDot, { backgroundColor: zoneColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.filterItemText, selectedZoneId === z.id && { color: '#166534', fontWeight: '700' }]}>
                          {z.codigo_zona}
                        </Text>
                        {z.name && <Text style={styles.filterItemSub}>{z.name}</Text>}
                        {isAdmin && vendorName && !selectedEmployeeId && (
                          <Text style={[styles.filterItemSub, { color: '#818CF8' }]}>👤 {vendorName}</Text>
                        )}
                      </View>
                      {selectedZoneId === z.id && <Ionicons name="checkmark-circle" size={18} color="#2a8c4a" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {!selectedZoneId && (
              <View style={styles.filterFooterHint}>
                <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                <Text style={styles.filterFooterHintText}>
                  Selecciona una zona para ver los puntos de ruta
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.reloadBtn} onPress={loadMapData}>
        <Ionicons name="refresh" size={20} color="#2a8c4a" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.myLocationBtn} onPress={centerOnMyLocation}>
        <Ionicons name="locate" size={22} color="#3B82F6" />
      </TouchableOpacity>

      <Modal visible={assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Asignar Cliente</Text>
                <Text style={styles.modalSubtitle}>Busca y selecciona un cliente para este punto</Text>
              </View>
              <TouchableOpacity onPress={() => { setAssignModal(false); setAssignResults([]); }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrapper}>
              <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
              <TextInput style={styles.modalSearchInput} placeholder="Nombre o código del cliente..."
                placeholderTextColor="#aaa" value={assignSearch} onChangeText={searchClientsForAssign} autoFocus />
              {assignLoading && <ActivityIndicator size="small" color="#6366F1" />}
            </View>

            <FlatList data={assignResults} keyExtractor={i => i.id} style={styles.modalList}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>
                  {assignSearch.length >= 2 && !assignLoading ? `Sin resultados para "${assignSearch}"` : 'Escribe al menos 2 caracteres'}
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalClientItem} onPress={() => assignClientToPoint(item)} disabled={savingAssign}>
                  <View style={styles.modalClientAvatar}>
                    <Text style={styles.modalClientInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalClientName}>{item.name}</Text>
                    {item.code    && <Text style={styles.modalClientSub}>{item.code}</Text>}
                    {item.address && <Text style={styles.modalClientSub} numberOfLines={1}>{item.address}</Text>}
                  </View>
                  {savingAssign
                    ? <ActivityIndicator size="small" color="#6366F1" />
                    : <Ionicons name="chevron-forward" size={18} color="#ccc" />
                  }
                </TouchableOpacity>
              )} />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  topBar: { position: 'absolute', top: 44, left: 12, right: 12, zIndex: 1000 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  trackingLabel: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600', color: '#6B7280' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 46, marginBottom: 6, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  suggestionsList: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 6, maxHeight: 200, elevation: 5, shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.1, shadowRadius:4 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e6f4ea', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  suggestionInitial: { color: '#2a8c4a', fontWeight: 'bold', fontSize: 13 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: '#333' },
  suggestionCode: { fontSize: 11, color: '#999' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', elevation: 4, borderWidth: 1.5, borderColor: '#2a8c4a', marginBottom: 6 },
  filterBtnActive: { backgroundColor: '#2a8c4a', borderColor: '#2a8c4a' },
  filterBtnPulse: { borderColor: '#F59E0B', borderWidth: 1.5 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#2a8c4a', marginLeft: 6, maxWidth: 200 },
  filterBtnSubText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginLeft: 2 },
  filtersPanel: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:8 },
  filterTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  filterTabActive: { backgroundColor: '#2a8c4a' },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#2a8c4a' },
  filterList: { maxHeight: 260 },
  filterItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterItemSelected: { backgroundColor: '#f0fdf4' },
  filterItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  filterItemSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  filterAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  filterAvatarText: { fontSize: 13, fontWeight: '700', color: '#6366F1' },
  filterZoneDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10, marginTop: 2 },
  filterContext: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E7FF' },
  filterContextText: { flex: 1, fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  filterContextChange: { fontSize: 12, color: '#6366F1', fontWeight: '700', textDecorationLine: 'underline' },
  filterZoneHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FAFAFA' },
  filterZoneHeaderText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  filterEmpty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  filterEmptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },
  filterFooterHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFBEB', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  filterFooterHintText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },
  reloadBtn: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#fff', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', elevation: 6, zIndex: 1000, shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  modalSearchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, height: 48, margin: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  modalSearchInput: { flex: 1, fontSize: 15, color: '#333' },
  modalList: { maxHeight: 350 },
  modalEmpty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 30 },
  modalClientItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalClientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalClientInitial: { fontSize: 16, fontWeight: '700', color: '#6366F1' },
  modalClientName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  modalClientSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  myLocationBtn: { position: 'absolute', bottom: 86, right: 20, backgroundColor: '#fff', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', elevation: 6, zIndex: 1000, shadowColor: '#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.15, shadowRadius:6 },
});