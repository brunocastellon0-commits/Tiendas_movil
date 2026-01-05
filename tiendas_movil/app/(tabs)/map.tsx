import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList,
  Keyboard, 
  Alert 
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// 
// Usamos Leaflet (librería ligera de mapas) desde CDN
const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { height: 100vh; width: 100vw; }
    .custom-icon {
      background-color: #fff;
      border: 2px solid #2a8c4a;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-weight: bold;
      color: #2a8c4a;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .custom-order-icon {
      background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
      border: 2px solid #1E40AF;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-size: 18px;
      font-weight: bold;
      color: white;
      box-shadow: 0 3px 6px rgba(37,99,235,0.4);
    }
    .custom-order-icon-sale {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      border: 2px solid #059669;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-size: 18px;
      font-weight: bold;
      color: white;
      box-shadow: 0 3px 6px rgba(16,185,129,0.4);
    }
    .custom-order-icon-no-sale {
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      border: 2px solid #D97706;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-size: 18px;
      font-weight: bold;
      color: white;
      box-shadow: 0 3px 6px rgba(245,158,11,0.4);
    }
    .custom-order-icon-closed {
      background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
      border: 2px solid #DC2626;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-size: 18px;
      font-weight: bold;
      color: white;
      box-shadow: 0 3px 6px rgba(239,68,68,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // 1. Inicializar Mapa
    var map = L.map('map', { zoomControl: false }).setView([-17.3895, -66.1568], 14);
    
    // 2. Capa de OpenStreetMap (GRATIS)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);
    var markersMap = {}; // Mapa para referencia rápida por ID

    // 3. Función para recibir datos desde React Native
    function updateMap(data) {
      if (data.type === 'UPDATE_DATA') {
        markersLayer.clearLayers();
        markersMap = {}; // Limpiar referencias
        
        // A. PINTAR CLIENTES (Rojo 🔴)
        if (data.clients && data.clients.length > 0) {
          data.clients.forEach(c => {
            if(c.lat && c.lng) {
              // Icono personalizado con la inicial
              var myIcon = L.divIcon({
                className: 'custom-icon',
                html: c.name.charAt(0).toUpperCase(),
                iconSize: [30, 30]
              });
              
              var marker = L.marker([c.lat, c.lng], {icon: myIcon})
                .bindPopup('<div style="text-align:center"><b>' + c.name + '</b><br><span style="color:#666;font-size:12px">' + (c.code || '') + '</span><br><button onclick="var msg = {action:\\'startVisit\\', clientId:\\''+c.id+'\\'}; window.ReactNativeWebView.postMessage(JSON.stringify(msg));" style="background:#2a8c4a;color:white;border:none;padding:6px 12px;border-radius:4px;margin-top:8px;font-weight:bold;width:100%">INICIAR VISITA</button></div>');
              
              markersLayer.addLayer(marker);
              markersMap[c.id] = marker; // Guardar referencia
            }
          });
        }

        // B. PINTAR PEDIDOS (Color dinámico según estado)
        if (data.orders && data.orders.length > 0) {
          data.orders.forEach(o => {
            if(o.lat && o.lng) {
              // Determinar la clase del icono según el outcome
              var iconClass = 'custom-order-icon';
              var iconSymbol = '$';
              var statusLabel = 'Pedido Realizado';
              var statusColor = '#64c27b';
              
              if (o.outcome === 'sale') {
                iconClass = 'custom-order-icon-sale';
                iconSymbol = '✓';
                statusLabel = '✅ Venta Realizada';
                statusColor = '#10B981';
              } else if (o.outcome === 'no_sale') {
                iconClass = 'custom-order-icon-no-sale';
                iconSymbol = '○';
                statusLabel = '⚠️ Sin Venta';
                statusColor = '#F59E0B';
              } else if (o.outcome === 'closed') {
                iconClass = 'custom-order-icon-closed';
                iconSymbol = '✕';
                statusLabel = '🔒 Tienda Cerrada';
                statusColor = '#EF4444';
              }
              
              var orderIcon = L.divIcon({
                className: iconClass,
                html: iconSymbol,
                iconSize: [32, 32]
              });
              
              var popupContent = '<div style="text-align:center"><b>' + statusLabel + '</b><br>';
              if (o.total > 0) {
                popupContent += '<span style="color:' + statusColor + ';font-size:16px;font-weight:bold">Bs. ' + o.total.toFixed(2) + '</span><br>';
              }
              popupContent += '<span style="color:#666;font-size:11px">' + (o.time || '') + '</span><br>';
              // Botón para TODOS los marcadores
              if (o.id.toString().startsWith('visit-')) {
                var visitId = o.id.toString().replace('visit-', '');
                popupContent += '<button onclick="var msg = {action:\\'viewVisit\\', visitId:\\''+visitId+'\\'}; window.ReactNativeWebView.postMessage(JSON.stringify(msg));" style="background:#3B82F6;color:white;border:none;padding:6px 12px;border-radius:4px;margin-top:8px;font-weight:bold;width:100%">VER DETALLE</button>';
              } else {
                popupContent += '<button onclick="var msg = {action:\\'viewOrder\\', orderId:\\''+o.id+'\\'}; window.ReactNativeWebView.postMessage(JSON.stringify(msg));" style="background:#3B82F6;color:white;border:none;padding:6px 12px;border-radius:4px;margin-top:8px;font-weight:bold;width:100%">VER DETALLE</button>';
              }
              popupContent += '</div>';
              
              L.marker([o.lat, o.lng], {icon: orderIcon})
                .bindPopup(popupContent)
                .addTo(markersLayer);
            }
          });
        }
      }
      
      if (data.type === 'CENTER_USER') {
        map.setView([data.lat, data.lng], 14);
        // Marcador azul para el usuario
        L.circleMarker([data.lat, data.lng], {
          radius: 8,
          fillColor: "#64c27b",
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);
      }

      // 4. NUEVA FUNCIONALIDAD: Volar a un marcador específico sin borrar el resto
      if (data.type === 'FLY_TO') {
        var m = markersMap[data.id];
        if (m) {
          map.setView(m.getLatLng(), 18);
          setTimeout(() => m.openPopup(), 300); // Pequeño delay para la animación
        }
      }
    }

    // Escuchar mensajes (Android/iOS)
    document.addEventListener("message", function(event) {
      updateMap(JSON.parse(event.data));
    });
    window.addEventListener("message", function(event) {
      updateMap(JSON.parse(event.data));
    });
  </script>
</body>
</html>
`;

export default function LeafletMapScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [searchText, setSearchText] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // 1. Cargar Datos Iniciales
  useEffect(() => {
    (async () => {
      // Ubicación del Usuario (con manejo de errores)
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            let loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            // Enviamos ubicación al mapa HTML
            setTimeout(() => {
              sendMessage({ 
                type: 'CENTER_USER', 
                lat: loc.coords.latitude, 
                lng: loc.coords.longitude 
              });
            }, 1000); 
          } catch (locError) {
            console.log('No se pudo obtener la ubicación GPS, usando coordenadas por defecto');
            // Si falla, usamos coordenadas por defecto (Cochabamba)
            setTimeout(() => {
              sendMessage({ 
                type: 'CENTER_USER', 
                lat: -17.3895, 
                lng: -66.1568 
              });
            }, 1000);
          }
        }
      } catch (permError) {
        console.log('Error al solicitar permisos de ubicación');
      }

      // Clientes desde Supabase
      try {
        const { data } = await supabase.from('clients').select('id, name, code, location');
        if (data) {
          // Simulamos lat/lng (Ajusta esto con tus datos reales de PostGIS)
          const processed = data.map((c: any) => ({
            ...c,
            lat: c.location ? -17.39 + (Math.random() * 0.02) : -17.39, // DATA DUMMY
            lng: c.location ? -66.15 + (Math.random() * 0.02) : -66.15
          }));
          setClients(processed);
          
          // C. Cargar pedidos del día
          const today = new Date().toISOString().split('T')[0];
          const { data: session } = await supabase.auth.getSession();
          
          let orderMarkers: any[] = [];
          if (session?.session?.user) {
            const { data: ordersData, error: ordersError } = await supabase
              .from('pedidos_auxiliares')
              .select(`
                id, 
                total_amount, 
                created_at,
                order_location,
                visit_id,
                visits:visit_id (
                  outcome
                )
              `)
              .eq('seller_id', session.session.user.id)
              .gte('created_at', `${today}T00:00:00`)
              .not('order_location', 'is', null);

            if (!ordersError && ordersData && ordersData.length > 0) {
              orderMarkers = ordersData.map((o: any) => {
                  
                let lat = null;
                let lng = null;

                if (o.order_location) {
                  // GeoJSON format
                  if (o.order_location.coordinates && Array.isArray(o.order_location.coordinates)) {
                    lng = o.order_location.coordinates[0];
                    lat = o.order_location.coordinates[1];
                  }
                  // WKT string format
                  else if (typeof o.order_location === 'string' && o.order_location.includes('POINT(')) {
                    const match = o.order_location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
                    if (match) {
                      lng = parseFloat(match[1]);
                      lat = parseFloat(match[2]);
                    }
                  }
                  // WKB hexadecimal format (PostGIS binary)
                  else if (typeof o.order_location === 'string' && o.order_location.length > 20) {
                    try {
                      const hex = o.order_location;
                      const lngHex = hex.slice(-32, -16);
                      const latHex = hex.slice(-16);
                      
                      const lngBuffer = new ArrayBuffer(8);
                      const lngView = new DataView(lngBuffer);
                      for (let i = 0; i < 8; i++) {
                        lngView.setUint8(i, parseInt(lngHex.substr(i * 2, 2), 16));
                      }
                      lng = lngView.getFloat64(0, true);
                      
                      const latBuffer = new ArrayBuffer(8);
                      const latView = new DataView(latBuffer);
                      for (let i = 0; i < 8; i++) {
                        latView.setUint8(i, parseInt(latHex.substr(i * 2, 2), 16));
                      }
                      lat = latView.getFloat64(0, true);
                    } catch (e) {
                      // Silently fail
                    }
                  }
                }

                if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                  // Extraer el outcome de la visita si existe
                  const visitData = Array.isArray(o.visits) ? o.visits[0] : o.visits;
                  const outcome = visitData?.outcome || null;
                  
                  return {
                    id: o.id,
                    lat: lat,
                    lng: lng,
                    total: o.total_amount,
                    outcome: outcome,
                    time: new Date(o.created_at).toLocaleTimeString('es-BO', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  };
                }
                return null;
              }).filter((o: any) => o !== null);
            }

            // D. Cargar TODAS las visitas del día (incluyendo las que NO tienen pedido)
            const { data: visitsData, error: visitsError } = await supabase
              .from('visits')
              .select(`
                id,
                client_id,
                outcome,
                end_time,
                check_out_location
              `)
              .eq('seller_id', session.session.user.id)
              .gte('end_time', `${today}T00:00:00`)
              .not('check_out_location', 'is', null)
              .not('outcome', 'eq', 'pending'); // Solo visitas finalizadas

            if (!visitsError && visitsData && visitsData.length > 0) {
              // Extraer los visit_ids que ya tienen pedido para evitar duplicados
              const visitIdsWithOrders = ordersData?.map((o: any) => o.visit_id).filter(Boolean) || [];

              const visitMarkers = visitsData
                .filter((v: any) => !visitIdsWithOrders.includes(v.id)) // Solo visitas SIN pedido
                .map((v: any) => {
                  let lat = null;
                  let lng = null;

                  if (v.check_out_location) {
                    // GeoJSON format
                    if (v.check_out_location.coordinates && Array.isArray(v.check_out_location.coordinates)) {
                      lng = v.check_out_location.coordinates[0];
                      lat = v.check_out_location.coordinates[1];
                    }
                    // WKT string format
                    else if (typeof v.check_out_location === 'string' && v.check_out_location.includes('POINT(')) {
                      const match = v.check_out_location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
                      if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                      }
                    }
                    // WKB hexadecimal format (PostGIS binary)
                    else if (typeof v.check_out_location === 'string' && v.check_out_location.length > 20) {
                      try {
                        const hex = v.check_out_location;
                        const lngHex = hex.slice(-32, -16);
                        const latHex = hex.slice(-16);
                        
                        const lngBuffer = new ArrayBuffer(8);
                        const lngView = new DataView(lngBuffer);
                        for (let i = 0; i < 8; i++) {
                          lngView.setUint8(i, parseInt(lngHex.substr(i * 2, 2), 16));
                        }
                        lng = lngView.getFloat64(0, true);
                        
                        const latBuffer = new ArrayBuffer(8);
                        const latView = new DataView(latBuffer);
                        for (let i = 0; i < 8; i++) {
                          latView.setUint8(i, parseInt(latHex.substr(i * 2, 2), 16));
                        }
                        lat = latView.getFloat64(0, true);
                      } catch (e) {
                        // Silently fail
                      }
                    }
                  }

                  if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
                    return {
                      id: `visit-${v.id}`,
                      lat: lat,
                      lng: lng,
                      total: 0, // Sin pedido = 0
                      outcome: v.outcome,
                      time: new Date(v.end_time).toLocaleTimeString('es-BO', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    };
                  }
                  return null;
                })
                .filter((v: any) => v !== null);

              // Combinar pedidos y visitas sin pedido
              orderMarkers = [...orderMarkers, ...visitMarkers];
            }
          }
          
         // Enviamos TODO al mapa (Clientes + Pedidos)
          setTimeout(() => {
            sendMessage({ 
              type: 'UPDATE_DATA', 
              clients: processed, 
              orders: orderMarkers
            });
          }, 1500);
        }
      } catch (dbError) {
        console.error('Error cargando clientes:', dbError);
        Alert.alert('Error', 'No se pudieron cargar los clientes');
      }
    })();
  }, []);

  // Función para hablar con el HTML
  const sendMessage = (payload: any) => {
    webViewRef.current?.postMessage(JSON.stringify(payload));
  };

  // 2. Buscador Mejorado
  const handleSearch = (text: string) => {
    setSearchText(text);
    if (!text) {
      setSuggestions([]);
      return;
    }

    const filtered = clients.filter(c => 
      c.name.toLowerCase().includes(text.toLowerCase()) || 
      (c.code && c.code.toLowerCase().includes(text.toLowerCase()))
    );
    setSuggestions(filtered.slice(0, 5)); // Limitamos a 5 sugerencias
  };

  const handleSelectClient = (client: any) => {
    setSearchText(client.name);
    setSuggestions([]);
    Keyboard.dismiss();
    
    // Le decimos al mapa que vuele a este cliente
    sendMessage({ type: 'FLY_TO', id: client.id });
  };

  const clearSearch = () => {
    setSearchText('');
    setSuggestions([]);
    Keyboard.dismiss();
  };

  // 3. Recibir mensajes desde el HTML (INICIAR VISITA o VER DETALLE DE PEDIDO)
  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.action === 'startVisit' && data.clientId) {
        // Navegar al cliente e iniciar visita automáticamente
        router.push(`/clients/${data.clientId}?autoStartVisit=true`);
      } else if (data.action === 'viewOrder' && data.orderId) {
        // Navegar al detalle del pedido
        router.push(`/pedidos/${data.orderId}` as any);
      } else if (data.action === 'viewVisit' && data.visitId) {
        // Navegar al detalle de la visita
        router.push(`/visitas/${data.visitId}` as any);
      }
    } catch (error) {
      // Si no es JSON, asumir que es el formato antiguo (solo clientId)
      const clientId = event.nativeEvent.data;
      if (clientId) {
        router.push(`/clients/${clientId}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* BARRA DE BÚSQUEDA FLOTANTE */}
      <View style={styles.searchContainer}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Buscar Cliente..."
            style={styles.input}
            value={searchText}
            onChangeText={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* LISTA DE SUGERENCIAS */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsList}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled" 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.suggestionItem} 
                  onPress={() => handleSelectClient(item)}
                >
                  <View style={styles.suggestionIcon}>
                    <Text style={styles.suggestionInitial}>{item.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    {item.code && <Text style={styles.suggestionCode}>{item.code}</Text>}
                  </View>
                  <Ionicons name="location-sharp" size={16} color="#2a8c4a" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* MAPA OPENSTREETMAP */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        style={styles.map}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 100, // Asegurar que esté por encima del mapa
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12, // Más redondeado
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: { flex: 1, fontSize: 16, color: '#1F2937' },
  
  suggestionsList: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 5,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d0fdd7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#9bfab0'
  },
  suggestionInitial: {
    color: '#2a8c4a',
    fontWeight: 'bold',
    fontSize: 14,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestionCode: {
    fontSize: 12,
    color: '#6B7280',
  }
});