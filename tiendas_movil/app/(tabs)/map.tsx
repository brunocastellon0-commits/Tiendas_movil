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

// --- HTML INTELIGENTE (El cerebro del mapa) ---
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
      border: 2px solid #DC2626;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-weight: bold;
      color: #DC2626;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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
      if (data.type === 'UPDATE_MARKERS') {
        markersLayer.clearLayers();
        markersMap = {}; // Limpiar referencias
        
        data.clients.forEach(c => {
          if(c.lat && c.lng) {
            // Icono personalizado con la inicial
            var myIcon = L.divIcon({
              className: 'custom-icon',
              html: c.name.charAt(0).toUpperCase(),
              iconSize: [30, 30]
            });
            
            var marker = L.marker([c.lat, c.lng], {icon: myIcon})
              .bindPopup('<div style="text-align:center"><b>' + c.name + '</b><br><span style="color:#666;font-size:12px">' + (c.code || '') + '</span><br><button onclick="window.ReactNativeWebView.postMessage(\\'' + c.id + '\\')" style="background:#DC2626;color:white;border:none;padding:6px 12px;border-radius:4px;margin-top:8px;font-weight:bold;width:100%">VISITAR</button></div>');
            
            markersLayer.addLayer(marker);
            markersMap[c.id] = marker; // Guardar referencia
            
            // Si es búsqueda única, centrar
            if (data.center) {
              map.setView([c.lat, c.lng], 16);
              marker.openPopup();
            }
          }
        });
      }
      
      if (data.type === 'CENTER_USER') {
        map.setView([data.lat, data.lng], 14);
        // Marcador azul para el usuario
        L.circleMarker([data.lat, data.lng], {
          radius: 8,
          fillColor: "#2563EB",
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
          
          // Enviamos marcadores al mapa
          setTimeout(() => {
            sendMessage({ type: 'UPDATE_MARKERS', clients: processed, center: false });
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

  // 3. Recibir mensaje "IR A TIENDA" desde el HTML
  const handleMessage = (event: any) => {
    const clientId = event.nativeEvent.data;
    if (clientId) {
      router.push(`/clients/${clientId}`);
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
                  <Ionicons name="location-sharp" size={16} color="#DC2626" style={{ marginLeft: 'auto' }} />
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
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  suggestionInitial: {
    color: '#4F46E5',
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