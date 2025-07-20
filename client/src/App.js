import './App.css';

import React, { useEffect, useState } from 'react';
import MapComponent from './MapComponent';
import axios from 'axios';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function App() {
  const [wktList, setWktList] = useState([]);
  const [newWKT, setNewWKT] = useState('');
  const [newName, setNewName] = useState('');
  const [deleteWKT, setDeleteWKT] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  // Yeni: Mesafe ölçüm formu kontrolü ve girdiler
  const [showDistanceForm, setShowDistanceForm] = useState(false);
  const [distanceWKT1, setDistanceWKT1] = useState('');
  const [distanceWKT2, setDistanceWKT2] = useState('');

  const [selectedPoint, setSelectedPoint] = useState(null);

  // **Ekleme modu** (haritaya tıklayınca nokta eklemek için)
  const [eklemeModu, setEklemeModu] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:5000/api/point')
      .then(res => {
        const wktData = res.data.data.map(point => ({
          id: point.id,
          wkt: point.wkt,
          name: point.name || `Nokta ${point.id}`,
          type: point.type || 'Point',
        }));
        setWktList(wktData);
      });
  }, []);

  // Haritaya tıklanan yeni noktayı backend'e kaydet ve state güncelle
  const handleNewPointFromMap = (wkt) => {
    const id = Date.now();
    const newEntry = {
      id,
      wkt,
      name: `Nokta ${id}`,
      type: 'Point',
    };

    axios.post('http://localhost:5000/api/point', newEntry)
      .then(() => {
        setWktList(prev => [...prev, newEntry]);
        setEklemeModu(false); // Nokta eklendikten sonra ekleme modunu kapat
      })
      .catch(err => {
        console.error('Nokta eklenirken hata:', err);
        alert('Nokta eklenirken hata oluştu!');
      });
  };

  const handleAddWKT = () => {
    if (newWKT.trim() === '' || newName.trim() === '') return;

    const id = Date.now();
    const geometryType = newWKT.startsWith('LINE') ? 'LineString' : 'Point';

    const newEntry = {
      id: id,
      wkt: newWKT,
      name: newName,
      type: geometryType,
    };

    // Eğer backend’e ekleme yapıyorsan burayı da axios.post ile düzenle
    setWktList(prev => [...prev, newEntry]);
    localStorage.setItem('wktList', JSON.stringify([...wktList, newEntry]));

    setNewWKT('');
    setNewName('');
  };

  const handleDeleteWKT = () => {
    const updatedList = wktList.filter(item => item.wkt !== deleteWKT);
    setWktList(updatedList);
    localStorage.setItem('wktList', JSON.stringify(updatedList));
    setDeleteWKT('');
  };

  const handleDistanceMeasure = () => {
    if (!distanceWKT1.trim() || !distanceWKT2.trim()) return;

    function parsePointCoords(wkt) {
      const regex = /POINT\s*\(\s*([-\d\.]+)\s+([-\d\.]+)\s*\)/i;
      const match = wkt.match(regex);
      if (!match) return null;
      return { lon: parseFloat(match[1]), lat: parseFloat(match[2]) };
    }

    const p1 = parsePointCoords(distanceWKT1);
    const p2 = parsePointCoords(distanceWKT2);

    if (!p1 || !p2) {
      alert('Lütfen geçerli POINT WKT formatında iki nokta girin (örnek: POINT(32.8597 39.9334))');
      return;
    }

    const dist = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);

    const lineWKT = `LINESTRING(${p1.lon} ${p1.lat}, ${p2.lon} ${p2.lat})`;

    const newLineEntry = {
      id: Date.now(),
      wkt: lineWKT,
      name: 'Mesafe Ölçümü',
      type: 'LineString',
      distance: dist.toFixed(2),
    };

    setWktList(prev => [...prev, newLineEntry]);
    localStorage.setItem('wktList', JSON.stringify([...wktList, newLineEntry]));

    setDistanceWKT1('');
    setDistanceWKT2('');
    setShowDistanceForm(false);
  };

  return (
    <div>
      <nav className='navbar'>
        <h1>TÜRKİYE HARİTASI</h1>

        <div className='form-buttons'>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEklemeModu(!eklemeModu); // Butona basınca ekleme modunu aç/kapat
            }}
            style={{ backgroundColor: eklemeModu ? '#d29ddc' : '' }}
          >
            WKT Ekle
          </button>
          <button onClick={() => setShowDeleteForm(!showDeleteForm)}>WKT Sil</button>
          <button onClick={() => setShowDistanceForm(!showDistanceForm)}>Mesafe Ölçümü</button>
        </div>

        {/* Ekleme formu */}
        {showAddForm && (
          <div className='form-area'>
            <input
              type='text'
              placeholder='Eklenecek Nokta:'
              value={newWKT}
              onChange={(e) => setNewWKT(e.target.value)}
            />
            <input
              type='text'
              placeholder='Konum Adı:'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button onClick={handleAddWKT}>Ekle</button>
          </div>
        )}

        {/* Silme formu */}
        {showDeleteForm && (
          <div className='form-area'>
            <input
              type='text'
              placeholder='Silinecek Nokta Değeri:'
              value={deleteWKT}
              onChange={(e) => setDeleteWKT(e.target.value)}
            />
            <button onClick={handleDeleteWKT}>Sil</button>
          </div>
        )}

        {/* Mesafe ölçüm formu */}
        {showDistanceForm && (
          <div className='form-area'>
            <input
              type='text'
              placeholder='1. WKT Noktası (POINT(...))'
              value={distanceWKT1}
              onChange={(e) => setDistanceWKT1(e.target.value)}
            />
            <input
              type='text'
              placeholder='2. WKT Noktası (POINT(...))'
              value={distanceWKT2}
              onChange={(e) => setDistanceWKT2(e.target.value)}
            />
            <button onClick={handleDistanceMeasure}>Mesafeyi Hesapla ve Çizgi Oluştur</button>
          </div>
        )}
      </nav>

      {/* Harita bileşeni */}
      <MapComponent
        wktList={wktList}
        setSelectedPoint={setSelectedPoint}
        isAddingPoint={eklemeModu}
        onNewPoint={handleNewPointFromMap}
      />

      {/* Bilgi penceresi */}
      {selectedPoint && (
        <div
          className="popup"
          style={{
            position: 'absolute',
            background: 'white',
            padding: '10px',
            border: '1px solid black',
            borderRadius: '5px',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            width: '300px',
          }}
        >
          <p><b>ID:</b> {selectedPoint.id}</p>
          <p><b>İsim:</b> {selectedPoint.name}</p>
          <p><b>WKT:</b> {selectedPoint.wkt}</p>
          <p><b>Tür:</b> {selectedPoint.type}</p>
          {selectedPoint.type === 'LineString' && selectedPoint.distance && (
            <p><b>Mesafe:</b> {selectedPoint.distance} km</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
