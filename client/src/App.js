import './App.css';

import React, { useEffect, useState } from 'react';
import MapComponent from './MapComponent';
import axios from 'axios';
import WKT from 'ol/format/WKT';

axios.defaults.baseURL = 'http://localhost:5228';

function isPointInPolygon(point, polygonWKT) {
  try {

    const polygon = new WKT().readFeature(polygonWKT, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857'
    }).getGeometry();

    const pointGeom = new WKT().readFeature(point, {
      dataProjection: 'EPSG:4326', 
      featureProjection: 'EPSG:3857'
    }).getGeometry();

    return polygon.intersectsCoordinate(pointGeom.getCoordinates());
  } catch (error) {
    console.error('Polygon kontrol hatasÄ±:', error);
    return false;
  }
}

function getActivePolygon(wktList, activePolygonId) {
  if (activePolygonId) {
    return wktList.find(item => item.id == activePolygonId);
  }
  return wktList.find(item => item.type === 'Polygon');
}

function getATypeEndpoints(wktList) {
  const aTypeObjects = wktList.filter(item => item.tip === 'A' && (item.type === 'Point' || item.type === 'LineString'));
  const endpoints = [];
  
  aTypeObjects.forEach(obj => {
    if (obj.type === 'Point') {

      endpoints.push(obj.wkt);
    } else if (obj.type === 'LineString') {
      const lineMatch = obj.wkt.match(/LINESTRING\s*\(\s*(.+?)\s*\)/i);
      if (lineMatch) {
        const points = lineMatch[1].split(',').map(p => p.trim());
        if (points.length >= 2) {
          endpoints.push(`POINT(${points[0]})`);
          endpoints.push(`POINT(${points[points.length - 1]})`);
        }
      }
    }
  });
  
  return endpoints;
}

function isBTypeValid(newObjWKT, wktList) {
  const aTypeEndpoints = getATypeEndpoints(wktList);
  
  if (newObjWKT.startsWith('POINT')) {
    return aTypeEndpoints.some(endpoint => endpoint === newObjWKT);
  } else if (newObjWKT.startsWith('LINESTRING')) {
    const lineMatch = newObjWKT.match(/LINESTRING\s*\(\s*(.+?)\s*\)/i);
    if (lineMatch) {
      const points = lineMatch[1].split(',').map(p => p.trim());
      if (points.length >= 2) {
        const startPoint = `POINT(${points[0]})`;
        const endPoint = `POINT(${points[points.length - 1]})`;
        
        return aTypeEndpoints.some(endpoint => 
          endpoint === startPoint || endpoint === endPoint
        );
      }
    }
  }
  
  return false;
}

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

  const [showDistanceForm, setShowDistanceForm] = useState(false);
  const [distanceWKT1, setDistanceWKT1] = useState('');
  const [distanceWKT2, setDistanceWKT2] = useState('');

  const [selectedPoint, setSelectedPoint] = useState(null);

  const [eklemeModu, setEklemeModu] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [clickedWKT, setClickedWKT] = useState(null);
  const [nameInput, setNameInput] = useState('');

  const [showLineModal, setShowLineModal] = useState(false);
  const [linePoint1, setLinePoint1] = useState('');
  const [linePoint2, setLinePoint2] = useState('');
  const [lineName, setLineName] = useState('');
  const [lineTip, setLineTip] = useState('A');

  const [showPointModal, setShowPointModal] = useState(false);
  const [pointWKT, setPointWKT] = useState('');
  const [pointName, setPointName] = useState('');
  const [pointTip, setPointTip] = useState('A');

  const [showPointDeleteModal, setShowPointDeleteModal] = useState(false);
  const [deletePointWKT, setDeletePointWKT] = useState('');
  const [deletePointName, setDeletePointName] = useState('');

  const [showPolygonModal, setShowPolygonModal] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState(['', '', '']);
  const [polygonName, setPolygonName] = useState('');

  const [pendingMapPoint, setPendingMapPoint] = useState(null);

  const [showPointOptionModal, setShowPointOptionModal] = useState(false);

  const [pendingMapLine, setPendingMapLine] = useState([]);
  const [pendingMapLineModal, setPendingMapLineModal] = useState(false);
  const [pendingMapLineName, setPendingMapLineName] = useState('');
  const [pendingMapLineTip, setPendingMapLineTip] = useState('A');

  const [showLineOptionModal, setShowLineOptionModal] = useState(false);

  useEffect(() => {
    if (pendingMapLine.length === 2) setPendingMapLineModal(true);
    else if (pendingMapLine.length < 2) setPendingMapLineModal(false);
  }, [pendingMapLine]);

  useEffect(() => {
    axios.get('/api/point')
      .then(res => {
        const wktData = res.data.data.map(point => ({
          id: point.id,
          wkt: point.wkt,
          name: point.name || `Nokta ${point.id}`,
          type: point.type || 'Point',
          tip: point.tip || undefined,
        }));
        setWktList(wktData);
      });
  }, []);

  const handleNewPointFromMap = (wkt) => {

    const activePolygon = getActivePolygon(wktList, activePolygonId);
    if (!activePolygon) {
      alert('Ã–nce bir polygon seÃ§in!');
      setEklemeModu(false);
      return;
    }

    if (!isPointInPolygon(wkt, activePolygon.wkt)) {
      alert('Sadece seÃ§ili polygon iÃ§inde Ã§izim yapabilirsiniz!');
      setEklemeModu(false);
      return;
    }


    
    setPendingMapPoint(wkt);
    setPointName('');
  };

  const handleNameModalSubmit = () => {
    if (!nameInput.trim() || !clickedWKT) return;
    const dto = {
      name: nameInput,
      wkt: clickedWKT,
      tip: selectedTip
    };
    axios.post(`/api/point?polygonId=${activePolygonId}` , dto)
      .then((res) => {


        setWktList(prev => [...prev, {
          id: res.data.id,
          wkt: clickedWKT,
          name: nameInput,
          type: 'Point',
          tip: selectedTip,
        }]);
        setShowNameModal(false);
        setClickedWKT(null);
        setNameInput('');
        setEklemeModu(false);
      })
      .catch(err => {
        alert(err?.response?.data?.mesaj || 'Nokta eklenirken hata oluÅŸtu!');
        setShowNameModal(false);
        setClickedWKT(null);
        setNameInput('');
        setEklemeModu(false);
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
      alert('LÃ¼tfen geÃ§erli POINT WKT formatÄ±nda iki nokta girin (Ã¶rnek: POINT(32.8597 39.9334))');
      return;
    }

    const dist = calculateDistance(p1.lat, p1.lon, p2.lat, p2.lon);

    const lineWKT = `LINESTRING(${p1.lon} ${p1.lat}, ${p2.lon} ${p2.lat})`;

    const newLineEntry = {
      id: Date.now(),
      wkt: lineWKT,
      name: 'Mesafe Ã–lÃ§Ã¼mÃ¼',
      type: 'LineString',
      distance: dist.toFixed(2),
    };

    setWktList(prev => [...prev, newLineEntry]);
    localStorage.setItem('wktList', JSON.stringify([...wktList, newLineEntry]));

    setDistanceWKT1('');
    setDistanceWKT2('');
    setShowDistanceForm(false);
  };

  const handleSetSelectedPoint = (point) => {
    setShowNameModal(false);
    setSelectedPoint(point);
  };

  const handleLineModalSubmit = () => {

    const activePolygon = getActivePolygon(wktList, activePolygonId);
    if (!activePolygon) {
      alert('Ã–nce bir polygon seÃ§in!');
      return;
    }

    const regex = /POINT\s*\(\s*([\d\.-]+)\s+([\d\.-]+)\s*\)/i;
    const match1 = linePoint1.match(regex);
    const match2 = linePoint2.match(regex);
    if (!match1 || !match2 || !lineName.trim()) {
      alert('LÃ¼tfen iki geÃ§erli POINT ve bir isim girin!');
      return;
    }

    const point1WKT = `POINT(${match1[1]} ${match1[2]})`;
    const point2WKT = `POINT(${match2[1]} ${match2[2]})`;
    
    if (!isPointInPolygon(point1WKT, activePolygon.wkt) || 
        !isPointInPolygon(point2WKT, activePolygon.wkt)) {
      alert('Line sadece seÃ§ili polygon iÃ§inde Ã§izilebilir!');
      return;
    }
    
    const x1 = match1[1], y1 = match1[2];
    const x2 = match2[1], y2 = match2[2];
    const lineWKT = `LINESTRING(${x1} ${y1}, ${x2} ${y2})`;

    if (lineTip === 'B') {
      if (!isBTypeValid(lineWKT, wktList)) {
        alert('B tipi objeler sadece A tipi objelerin baÅŸlangÄ±Ã§ veya bitiÅŸ noktalarÄ±yla kesiÅŸebilir!');
        return;
      }
    }
    const dto = {
      name: lineName,
      wkt: lineWKT,
      tip: lineTip
    };
    axios.post(`/api/point?polygonId=${activePolygonId}`, dto)
      .then(res => {
        setWktList(prev => [...prev, {
          id: res.data.id,
          wkt: res.data.wkt,
          name: res.data.name,
          type: res.data.type,
          tip: lineTip
        }]);
        setShowLineModal(false);
        setLinePoint1('');
        setLinePoint2('');
        setLineName('');
        setLineTip('A');
      })
      .catch((err) => {
        alert(err?.response?.data?.mesaj || 'Ã‡izgi eklenirken hata oluÅŸtu!');
      });
  };

  const handlePointModalSubmit = () => {

    const activePolygon = getActivePolygon(wktList, activePolygonId);
    if (!activePolygon) {
      alert('Ã–nce bir polygon seÃ§in!');
      return;
    }

    const regex = /POINT\s*\(\s*([\d\.-]+)\s+([\d\.-]+)\s*\)/i;
    const match = pointWKT.match(regex);
    if (!match || !pointName.trim()) {
      alert('LÃ¼tfen geÃ§erli bir POINT ve isim girin!');
      return;
    }

    if (!isPointInPolygon(pointWKT, activePolygon.wkt)) {
      alert('Point sadece seÃ§ili polygon iÃ§inde Ã§izilebilir!');
      return;
    }

    if (pointTip === 'B') {
      if (!isBTypeValid(pointWKT, wktList)) {
        alert('B tipi objeler sadece A tipi objelerin baÅŸlangÄ±Ã§ veya bitiÅŸ noktalarÄ±yla kesiÅŸebilir!');
        return;
      }
    }
    
    const wkt = pointWKT;
    const dto = {
      name: pointName,
      wkt: wkt,
      tip: pointTip
    };
    axios.post(`/api/point?polygonId=${activePolygonId}`, dto)
      .then(res => {
        setWktList(prev => [...prev, {
          id: res.data.id, // Backend'den dÃ¶nen id kullanÄ±lÄ±yor
          wkt: res.data.wkt,
          name: res.data.name,
          type: res.data.type,
          tip: pointTip
        }]);
        setShowPointModal(false);
        setPointWKT('');
        setPointName('');
        setPointTip('A');
      })
      .catch((err) => {
        alert(err?.response?.data?.mesaj || 'Nokta eklenirken hata oluÅŸtu!');
      });
  };

  const handlePointDeleteModalSubmit = () => {

    let target = null;
    if (deletePointWKT.trim()) {
      target = wktList.find(item => item.wkt === deletePointWKT.trim());
    } else if (deletePointName.trim()) {
      target = wktList.find(item => item.name === deletePointName.trim());
    } else {
      alert('LÃ¼tfen silmek iÃ§in bir WKT veya isim girin!');
      return;
    }
    if (!target) {
      alert('Silinecek nokta bulunamadÄ±!');
      return;
    }

    axios.delete(`/api/point/${target.id}`)
      .then(() => {
        setWktList(prev => prev.filter(item => item.id !== target.id));
        setShowPointDeleteModal(false);
        setDeletePointWKT('');
        setDeletePointName('');
      })
      .catch(() => {
        alert('Silme iÅŸlemi baÅŸarÄ±sÄ±z!');
      });
  };

  const handlePolygonModalSubmit = () => {

    const regex = /POINT\s*\(\s*([\d\.-]+)\s+([\d\.-]+)\s*\)/i;
    const coords = polygonPoints
      .map(p => {
        const match = p.match(regex);
        return match ? `${match[1]} ${match[2]}` : null;
      })
      .filter(Boolean);
    if (coords.length < 3 || !polygonName.trim()) {
      alert('En az 3 geÃ§erli POINT ve bir isim girin!');
      return;
    }

    coords.push(coords[0]);
    const polyWKT = `POLYGON((${coords.join(', ')}))`;
    const dto = {
      name: polygonName,
      wkt: polyWKT
    };
    axios.post('/api/point', dto)
      .then(res => {
        setWktList(prev => [...prev, {
          id: res.data.id,
          wkt: res.data.wkt,
          name: res.data.name,
          type: res.data.type,
        }]);
        setShowPolygonModal(false);
        setPolygonPoints(['', '', '']);
        setPolygonName('');
      })
      .catch(() => {
        alert('Poligon eklenirken hata oluÅŸtu!');
      });
  };

  const [pendingDrawnLineWKT, setPendingDrawnLineWKT] = useState(null);
  const [pendingDrawnLineName, setPendingDrawnLineName] = useState('');

  const [pendingDrawnPolygonWKT, setPendingDrawnPolygonWKT] = useState(null);
  const [pendingDrawnPolygonName, setPendingDrawnPolygonName] = useState('');
  const [showPolygonOptionModal, setShowPolygonOptionModal] = useState(false);

  const [showDeleteOptionModal, setShowDeleteOptionModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'point', 'line', 'polygon'

  const [showLineDeleteModal, setShowLineDeleteModal] = useState(false);
  const [deleteLineWKT, setDeleteLineWKT] = useState('');
  const [deleteLineName, setDeleteLineName] = useState('');
  const [showPolygonDeleteModal, setShowPolygonDeleteModal] = useState(false);
  const [deletePolygonWKT, setDeletePolygonWKT] = useState('');
  const [deletePolygonName, setDeletePolygonName] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [activePolygonId, setActivePolygonId] = useState(null);

  const [selectedTip, setSelectedTip] = useState('A');

  return (
    <div>
      <nav className='navbar' style={{background:'#6c2eb7', color:'#fff', padding:'24px 0 16px 0', borderRadius:'0 0 8px 8px', boxShadow:'0 2px 12px rgba(108,46,183,0.06)', marginBottom:0}}>
        <h1 style={{
          margin:'0 0 8px 0',
          fontWeight:600,
          fontFamily:'Inter, Segoe UI, Arial, sans-serif',
          fontSize:'2.1rem',
          letterSpacing:'2px',
          color:'#fff',
          textShadow:'0 2px 8px rgba(108,46,183,0.08)',
          borderBottom:'1.5px solid #e0d7f7',
          paddingBottom: '6px',
          marginBottom: '12px',
          lineHeight: 1.1
        }}>TÃ¼rkiye HaritasÄ±</h1>
        <div style={{fontSize:'1.1rem', color:'#e0d7f7', marginBottom:16, fontWeight:500, letterSpacing:'0.5px'}}>CoÄŸrafi Veri YÃ¶netimi Sistemi</div>
        <div style={{fontSize:'0.9rem', color:'#e0d7f7', marginBottom:8, fontWeight:400}}>
          {getActivePolygon(wktList, activePolygonId) ? 
            `âœ… Aktif Polygon: ${getActivePolygon(wktList, activePolygonId).name}` : 
            'âš ï¸ Ã–nce polygon oluÅŸturun!'
          }
        </div>
        <div style={{fontSize:'0.9rem', color:'#e0d7f7', marginBottom:8, fontWeight:400}}>
          ğŸ¯ SeÃ§ili Tip: <strong style={{color:'#fff'}}>Tip {selectedTip}</strong>
        </div>
        <div style={{marginBottom:16}}>
          <select 
            value={activePolygonId || ''} 
            onChange={(e) => setActivePolygonId(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e0d7f7',
              background: '#fff',
              color: '#6c2eb7',
              fontSize: '0.9rem',
              fontWeight: '500',
              minWidth: '200px',
              marginRight: '12px'
            }}
          >
            <option value="">Polygon SeÃ§in</option>
            {wktList.filter(item => item.type === 'Polygon').map(polygon => (
              <option key={polygon.id} value={polygon.id}>
                {polygon.name} (ID: {polygon.id})
              </option>
            ))}
          </select>
          
          <select 
            value={selectedTip} 
            onChange={(e) => setSelectedTip(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e0d7f7',
              background: '#fff',
              color: '#6c2eb7',
              fontSize: '0.9rem',
              fontWeight: '500',
              minWidth: '150px'
            }}
          >
            <option value="A">Tip A</option>
            <option value="B">Tip B</option>
            <option value="C">Tip C</option>
          </select>
        </div>
        <div className='form-buttons' style={{display:'flex',gap:12,flexWrap:'wrap',justifyContent:'space-between',alignItems:'center',maxWidth:600,margin:'0 auto'}}>
          <div style={{display:'flex',gap:12}}>
            <button
              onClick={() => {
                setShowPointOptionModal(true);
                setSelectedPoint(null); // Ekleme moduna girerken bilgi penceresini kapat
              }}
              style={{ backgroundColor: eklemeModu ? '#d29ddc' : '' }}
            >
              Point Ekle
            </button>
            <button onClick={() => {
              setShowLineOptionModal(true);
              setSelectedPoint(null);
            }}>Line Ekle</button>
            <button onClick={() => {
              setShowPolygonOptionModal(true);
              setSelectedPoint(null);
            }}>Poligon Ekle</button>
          </div>
          <button onClick={() => {
            setShowDeleteOptionModal(true);
            setSelectedPoint(null);
          }}>Veri Sil</button>
        </div>

        
        {showPointOptionModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowPointOptionModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Point Ekleme YÃ¶ntemi SeÃ§</h3>
              <button style={{width:'100%',marginBottom:10}} onClick={()=>{setShowPointOptionModal(false);setShowPointModal(true);}}>Koordinat Girerek Ekle</button>
              <button style={{width:'100%'}} onClick={()=>{
                setShowPointOptionModal(false);
                setEklemeModu(true);
              }}>Haritaya TÄ±klayarak Ekle</button>
            </div>
          </div>
        )}

        
        {showPointModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowPointModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Nokta (Point) Ekle</h3>
              <input
                type="text"
                placeholder="Nokta (POINT(x y))"
                value={pointWKT}
                onChange={e => setPointWKT(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              />
              <input
                type="text"
                placeholder="Nokta AdÄ±"
                value={pointName}
                onChange={e => setPointName(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              />
              <select
                value={pointTip}
                onChange={e => setPointTip(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              >
                <option value="A">A Tipi (Polygon iÃ§inde herhangi yere Ã§izilebilir)</option>
                <option value="B">B Tipi (A tipi objelerin baÅŸlangÄ±Ã§/bitiÅŸ noktalarÄ±yla kesiÅŸmeli)</option>
                <option value="C">C Tipi (A tipi objelerle kesiÅŸmemeli, B tipi Ã¼zerine Ã§izilebilir)</option>
              </select>
              <div style={{display:'flex',gap:10}}>
                <button onClick={handlePointModalSubmit}>Kaydet</button>
                <button onClick={()=>setShowPointModal(false)}>Ä°ptal</button>
              </div>
            </div>
          </div>
        )}
        
        {pendingMapPoint && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>{setPendingMapPoint(null);setEklemeModu(false);}} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Haritadan Nokta Ekle</h3>
              <p style={{fontSize:12, color:'#888'}}>Koordinat: {pendingMapPoint}</p>
              <input
                type="text"
                placeholder="Nokta AdÄ±"
                value={pointName}
                onChange={e => setPointName(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              />
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{

                  const dto = { 
                    name: pointName, 
                    wkt: pendingMapPoint,
                    tip: selectedTip
                  };
                  axios.post(`/api/point?polygonId=${activePolygonId}`, dto)
                    .then((res) => {
                      setWktList(prev => [...prev, {
                        id: res.data.id,
                        wkt: res.data.wkt ?? pendingMapPoint,
                        name: res.data.name ?? pointName,
                        type: res.data.type ?? 'Point',
                        tip: selectedTip
                      }]);
                      setPendingMapPoint(null);
                      setPointName('');
                      setEklemeModu(false);
                    })
                    .catch((err) => {
                      alert(err?.response?.data?.mesaj || 'Nokta eklenirken hata oluÅŸtu!');
                    });
                }}>Kaydet</button>
                <button onClick={()=>{setPendingMapPoint(null);setEklemeModu(false);}}>Ä°ptal</button>
              </div>
            </div>
          </div>
        )}

        
        {showPointDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowPointDeleteModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Nokta (Point) Sil</h3>
              <select
                style={{width:'100%',marginBottom:10}}
                value={deletePointName}
                onChange={e => setDeletePointName(e.target.value)}
              >
                <option value="">Nokta SeÃ§in</option>
                 {wktList.filter(item => item.type === 'Point').map(item => (
                   <option key={item.id} value={item.name}>{item.name} (ID: {item.id}) - {item.wkt}</option>
                 ))}
              </select>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  let target = wktList.find(item => item.type === 'Point' && item.name === deletePointName);
                  if (!target) {
                    alert('Silinecek nokta bulunamadÄ±!');
                    return;
                  }
                  axios.delete(`/api/point/${target.id}`)
                    .then(() => {
                      setWktList(prev => prev.filter(item => item.id !== target.id));
                      setShowPointDeleteModal(false);
                      setDeletePointWKT('');
                      setDeletePointName('');
                    })
                    .catch(() => {
                      alert('Silme iÅŸlemi baÅŸarÄ±sÄ±z!');
                    });
                }}>Sil</button>
                <button onClick={()=>setShowPointDeleteModal(false)}>Ä°ptal</button>
              </div>
            </div>
          </div>
        )}

        
        {showPolygonModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowPolygonModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Poligon Ekle</h3>
              {polygonPoints.map((pt, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`KÃ¶ÅŸe ${idx+1} (POINT(x y))`}
                  value={pt}
                  onChange={e => {
                    const arr = [...polygonPoints];
                    arr[idx] = e.target.value;
                    setPolygonPoints(arr);
                  }}
                  style={{width:'100%',marginBottom:10}}
                />
              ))}
              <button style={{marginBottom:10}} onClick={()=>setPolygonPoints([...polygonPoints, ''])}>KÃ¶ÅŸe Ekle +</button>
              <input
                type="text"
                placeholder="Poligon AdÄ±"
                value={polygonName}
                onChange={e => setPolygonName(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              />
              <div style={{display:'flex',gap:10}}>
                <button onClick={handlePolygonModalSubmit}>Kaydet</button>
                <button onClick={()=>setShowPolygonModal(false)}>Ä°ptal</button>
              </div>
            </div>
          </div>
        )}

        
        {showDeleteOptionModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowDeleteOptionModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Silmek Ä°stediÄŸiniz Veri Tipini SeÃ§in</h3>
              <button style={{width:'100%',marginBottom:10}} onClick={()=>{setShowDeleteOptionModal(false);setDeleteType('point');setShowPointDeleteModal(true);}}>Point Sil</button>
              <button style={{width:'100%',marginBottom:10}} onClick={()=>{setShowDeleteOptionModal(false);setDeleteType('line');setShowLineDeleteModal(true);}}>Line Sil</button>
              <button style={{width:'100%'}} onClick={()=>{setShowDeleteOptionModal(false);setDeleteType('polygon');setShowPolygonDeleteModal(true);}}>Polygon Sil</button>
            </div>
          </div>
        )}

        
        {showLineDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowLineDeleteModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Ã‡izgi (Line) Sil</h3>
              <select
                style={{width:'100%',marginBottom:10}}
                value={deleteLineName}
                onChange={e => setDeleteLineName(e.target.value)}
              >
                <option value="">Ã‡izgi SeÃ§in</option>
                 {wktList.filter(item => item.type === 'LineString').map(item => (
                   <option key={item.id} value={item.name}>{item.name} (ID: {item.id}) - {item.wkt}</option>
                 ))}
              </select>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  let target = wktList.find(item => item.type === 'LineString' && item.name === deleteLineName);
                  if (!target) {
                    alert('Silinecek Ã§izgi bulunamadÄ±!');
                    return;
                  }
                  axios.delete(`/api/point/${target.id}`)
                    .then(() => {
                      setWktList(prev => prev.filter(item => item.id !== target.id));
                      setShowLineDeleteModal(false);
                      setDeleteLineWKT('');
                      setDeleteLineName('');
                    })
                    .catch(() => {
                      alert('Silme iÅŸlemi baÅŸarÄ±sÄ±z!');
                    });
                }}>Sil</button>
                <button onClick={()=>setShowLineDeleteModal(false)}>Ä°ptal</button>
              </div>
            </div>
          </div>
        )}
        
        {showPolygonDeleteModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{position:'relative'}}>
              <button onClick={()=>setShowPolygonDeleteModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
              <h3>Poligon (Polygon) Sil</h3>
              <select
                style={{width:'100%',marginBottom:10}}
                value={deletePolygonName}
                onChange={e => setDeletePolygonName(e.target.value)}
              >
                <option value="">Poligon SeÃ§in</option>
                 {wktList.filter(item => item.type === 'Polygon').map(item => (
                   <option key={item.id} value={item.name}>{item.name} (ID: {item.id}) - {item.wkt}</option>
                 ))}
              </select>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{
                  let target = wktList.find(item => item.type === 'Polygon' && item.name === deletePolygonName);
                  if (!target) {
                    alert('Silinecek poligon bulunamadÄ±!');
                    return;
                  }
                  axios.delete(`/api/point/${target.id}`)
                    .then(() => {
                      setWktList(prev => prev.filter(item => item.id !== target.id));
                      setShowPolygonDeleteModal(false);
                      setDeletePolygonWKT('');
                      setDeletePolygonName('');
                    })
                    .catch(() => {
                      alert('Silme iÅŸlemi baÅŸarÄ±sÄ±z!');
                    });
                }}>Sil</button>
                <button onClick={()=>setShowPolygonDeleteModal(false)}>Ä°ptal</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      
      <MapComponent
        wktList={wktList}
        setSelectedPoint={handleSetSelectedPoint}
        isAddingPoint={eklemeModu === true}
        isAddingLine={eklemeModu === 'line'}
        isAddingPolygon={eklemeModu === 'polygon'}
        onNewPoint={handleNewPointFromMap}
        onNewLinePoint={pt => setPendingMapLine(prev => [...prev, pt])}
        onNewLineWKT={wkt => {
          setPendingDrawnLineWKT(wkt);
          setEklemeModu(false);
        }}
        onNewPolygonWKT={wkt => {
          setPendingDrawnPolygonWKT(wkt);
          setEklemeModu(false);
        }}
      />

      
      <div style={{maxWidth:900, margin:'32px auto 0 auto', background:'#fff', borderRadius:12, boxShadow:'0 2px 16px rgba(108,46,183,0.06)', padding:24}}>
        <h2 style={{color:'#6c2eb7', fontWeight:700, fontSize:'1.2rem', marginBottom:16, letterSpacing:'1px'}}>Mevcut Veriler</h2>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'1rem'}}>
          <thead>
            <tr style={{background:'#f8f6fc'}}>
              <th style={{padding:'8px', borderBottom:'2px solid #e0d7f7', color:'#6c2eb7', fontWeight:600}}>ID</th>
              <th style={{padding:'8px', borderBottom:'2px solid #e0d7f7', color:'#6c2eb7', fontWeight:600}}>Ad</th>
              <th style={{padding:'8px', borderBottom:'2px solid #e0d7f7', color:'#6c2eb7', fontWeight:600}}>TÃ¼r</th>
              <th style={{padding:'8px', borderBottom:'2px solid #e0d7f7', color:'#6c2eb7', fontWeight:600}}>Tip</th>
              <th style={{padding:'8px', borderBottom:'2px solid #e0d7f7', color:'#6c2eb7', fontWeight:600, textAlign:'center'}}>DÃ¼zenle</th>
            </tr>
          </thead>
          <tbody>
            {wktList.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center', color:'#aaa', padding:'16px'}}>KayÄ±t yok</td></tr>
            ) : (
              wktList.map(item => (
                <tr key={item.id} style={{borderBottom:'1px solid #f0e9fa'}}>
                  <td style={{padding:'8px', color:'#333'}}>{item.id}</td>
                  <td style={{padding:'8px', color:'#333'}}>
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        style={{padding:'4px 8px', borderRadius:4, border:'1px solid #a084ca', marginRight:8}}
                      />
                    ) : (
                      item.name
                    )}
                  </td>
                  <td style={{padding:'8px', color:'#333', textTransform:'capitalize'}}>{item.type}</td>
                  <td style={{padding:'8px', color:'#333', fontWeight:'bold'}}>
                    {item.type === 'Polygon' ? '-' : (item.tip || 'A')}
                  </td>
                  <td style={{padding:'8px', textAlign:'center'}}>
                    {editingId === item.id ? (
                      <>
                        <button style={{background:'#6c2eb7',color:'#fff',border:'none',borderRadius:4,padding:'4px 10px',marginRight:4,cursor:'pointer'}} onClick={() => {
                          axios.put(`/api/point/${item.id}/wkt`, { wkt: item.wkt, name: editingName })
                            .then(() => {
                              setWktList(prev => prev.map(x => x.id === item.id ? { ...x, name: editingName } : x));
                              setEditingId(null);
                              setEditingName('');
                            })
                            .catch(() => alert('GÃ¼ncelleme baÅŸarÄ±sÄ±z!'));
                        }}>Kaydet</button>
                        <button style={{background:'#e0e0e0',color:'#333',border:'none',borderRadius:4,padding:'4px 10px',cursor:'pointer'}} onClick={() => { setEditingId(null); setEditingName(''); }}>Ä°ptal</button>
                      </>
                    ) : (
                      <span
                        style={{marginLeft:0, cursor:'pointer', color:'#6c2eb7', fontSize:20, verticalAlign:'middle', display:'inline-block'}}
                        title="DÃ¼zenle"
                        onClick={() => { setEditingId(item.id); setEditingName(item.name); }}
                      >
                        
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M14.7 2.29a1 1 0 0 1 1.41 0l1.6 1.6a1 1 0 0 1 0 1.41l-9.13 9.13a1 1 0 0 1-.45.26l-3.2.8a.5.5 0 0 1-.61-.61l.8-3.2a1 1 0 0 1 .26-.45l9.13-9.13ZM13.29 4 4 13.29V16h2.71L16 6.71 13.29 4Z" fill="#6c2eb7"/>
                        </svg>
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      
      {selectedPoint && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>setSelectedPoint(null)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>{selectedPoint.type === 'Polygon' ? 'Poligon Bilgisi' : selectedPoint.type === 'LineString' ? 'Ã‡izgi Bilgisi' : 'Nokta Bilgisi'}</h3>
            <p><b>ID:</b> {selectedPoint.id}</p>
            <p><b>Ä°sim:</b> {selectedPoint.name}</p>
            <p><b>WKT:</b> {selectedPoint.wkt}</p>
            <p><b>TÃ¼r:</b> {selectedPoint.type}</p>
            {selectedPoint.type !== 'Polygon' && (
              <p><b>Tip:</b> {selectedPoint.tip || '-'}</p>
            )}
            {selectedPoint.type === 'LineString' && selectedPoint.distance && (
              <p><b>Mesafe:</b> {selectedPoint.distance} km</p>
            )}
            
            {selectedPoint.type === 'Polygon' && (
              <>
                
                {(() => {
                  try {
                    const poly = new WKT().readFeature(selectedPoint.wkt, {dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).getGeometry();
                    const count = wktList.filter(item => item.type === 'Point').filter(pt => {
                      const ptGeom = new WKT().readFeature(pt.wkt, {dataProjection:'EPSG:4326',featureProjection:'EPSG:3857'}).getGeometry();
                      return poly.intersectsCoordinate(ptGeom.getCoordinates());
                    }).length;
                    return <p><b>Poligondaki Mevcut Point SayÄ±sÄ±:</b> {count}</p>;
                  } catch {
                    return <p><b>Poligondaki Mevcut Point SayÄ±sÄ±:</b> HesaplanamadÄ±</p>;
                  }
                })()}
                
              </>
            )}
          </div>
        </div>
      )}

      
      {showNameModal && (
        <div className="modal-overlay" style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="modal-content" style={{background:'white',padding:30,borderRadius:10,minWidth:300}}>
            <h3>Yeni Nokta Ekle</h3>
            <p>Koordinat: <span style={{fontSize:12}}>{clickedWKT}</span></p>
            <input
              type="text"
              placeholder="Nokta adÄ± giriniz"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
            <div style={{display:'flex',gap:10}}>
              <button onClick={handleNameModalSubmit}>Kaydet</button>
              <button onClick={()=>{setShowNameModal(false);setClickedWKT(null);setNameInput('');setEklemeModu(false);}}>Ä°ptal</button>
            </div>
          </div>
        </div>
      )}

      
      {showLineModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>setShowLineModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>Ã‡izgi (Line) Ekle</h3>
            <input
              type="text"
              placeholder="1. Nokta (POINT(x y))"
              value={linePoint1}
              onChange={e => setLinePoint1(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
            <input
              type="text"
              placeholder="2. Nokta (POINT(x y))"
              value={linePoint2}
              onChange={e => setLinePoint2(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
            <input
              type="text"
              placeholder="Ã‡izgi AdÄ±"
              value={lineName}
              onChange={e => setLineName(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
                          <select
                value={lineTip}
                onChange={e => setLineTip(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              >
                <option value="A">A Tipi (Polygon iÃ§inde herhangi yere Ã§izilebilir)</option>
                <option value="B">B Tipi (A tipi objelerin baÅŸlangÄ±Ã§/bitiÅŸ noktalarÄ±yla kesiÅŸmeli)</option>
                <option value="C">C Tipi (A tipi objelerle kesiÅŸmemeli, B tipi Ã¼zerine Ã§izilebilir)</option>
              </select>
            <div style={{display:'flex',gap:10}}>
              <button onClick={handleLineModalSubmit}>Kaydet</button>
              <button onClick={()=>setShowLineModal(false)}>Ä°ptal</button>
            </div>
          </div>
        </div>
      )}

      
      {pendingMapLineModal && pendingMapLine.length === 2 && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>{setPendingMapLine([]);setPendingMapLineModal(false);setEklemeModu(false);}} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>Haritadan Ã‡izgi (Line) Ekle</h3>
            <p style={{fontSize:12, color:'#888'}}>1. Nokta: {pendingMapLine[0]}</p>
            <p style={{fontSize:12, color:'#888'}}>2. Nokta: {pendingMapLine[1]}</p>
            <input
              type="text"
              placeholder="Ã‡izgi AdÄ±"
              value={pendingMapLineName}
              onChange={e => setPendingMapLineName(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
                          <select
                value={pendingMapLineTip}
                onChange={e => setPendingMapLineTip(e.target.value)}
                style={{width:'100%',marginBottom:10}}
              >
                <option value="A">A Tipi (Polygon iÃ§inde herhangi yere Ã§izilebilir)</option>
                <option value="B">B Tipi (A tipi objelerin baÅŸlangÄ±Ã§/bitiÅŸ noktalarÄ±yla kesiÅŸmeli)</option>
                <option value="C">C Tipi (A tipi objelerle kesiÅŸmemeli, B tipi Ã¼zerine Ã§izilebilir)</option>
              </select>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{

                const activePolygon = getActivePolygon(wktList, activePolygonId);
                if (!activePolygon) {
                  alert('Ã–nce bir polygon seÃ§in!');
                  return;
                }

                const regex = /POINT\s*\(\s*([\d\.-]+)\s+([\d\.-]+)\s*\)/i;
                const match1 = pendingMapLine[0].match(regex);
                const match2 = pendingMapLine[1].match(regex);
                if (!match1 || !match2 || !pendingMapLineName.trim()) {
                  alert('GeÃ§erli iki nokta ve isim girin!');
                  return;
                }

                const point1WKT = `POINT(${match1[1]} ${match1[2]})`;
                const point2WKT = `POINT(${match2[1]} ${match2[2]})`;
                
                if (!isPointInPolygon(point1WKT, activePolygon.wkt) || 
                    !isPointInPolygon(point2WKT, activePolygon.wkt)) {
                  alert('Line sadece seÃ§ili polygon iÃ§inde Ã§izilebilir!');
                  return;
                }

                if (pendingMapLineTip === 'B') {
                  if (!isBTypeValid(lineWKT, wktList)) {
                    alert('B tipi objeler sadece A tipi objelerin baÅŸlangÄ±Ã§ veya bitiÅŸ noktalarÄ±yla kesiÅŸebilir!');
                    return;
                  }
                }
                
                const x1 = match1[1], y1 = match1[2];
                const x2 = match2[1], y2 = match2[2];
                const lineWKT = `LINESTRING(${x1} ${y1}, ${x2} ${y2})`;
                const dto = {
                  name: pendingMapLineName,
                  wkt: lineWKT,
                  tip: pendingMapLineTip
                };
                axios.post(`/api/point?polygonId=${activePolygonId}`, dto)
                  .then(res => {
                    setWktList(prev => [...prev, {
                      id: res.data.id,
                      wkt: res.data.wkt,
                      name: res.data.name,
                      type: res.data.type,
                      tip: pendingMapLineTip
                    }]);
                    setPendingMapLine([]);
                    setPendingMapLineModal(false);
                    setPendingMapLineName('');
                    setPendingMapLineTip('A');
                    setEklemeModu(false);
                  })
                  .catch((err) => {
                    alert(err?.response?.data?.mesaj || 'Ã‡izgi eklenirken hata oluÅŸtu!');
                  });
              }}>Kaydet</button>
              <button onClick={()=>{setPendingMapLine([]);setPendingMapLineModal(false);setEklemeModu(false);}}>Ä°ptal</button>
            </div>
          </div>
        </div>
      )}

      
      {pendingDrawnLineWKT && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>{setPendingDrawnLineWKT(null);setPendingDrawnLineName('');}} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>Haritadan Ã‡izgi (Line) Ekle</h3>
            <p style={{fontSize:12, color:'#888'}}>Ã‡izgi WKT: {pendingDrawnLineWKT}</p>
            <input
              type="text"
              placeholder="Ã‡izgi AdÄ±"
              value={pendingDrawnLineName}
              onChange={e => setPendingDrawnLineName(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{

                const activePolygon = getActivePolygon(wktList, activePolygonId);
                if (!activePolygon) {
                  alert('Ã–nce bir polygon seÃ§in!');
                  return;
                }
                
                if (!pendingDrawnLineName.trim()) {
                  alert('Ã‡izgi adÄ± girin!');
                  return;
                }


                const lineCoords = pendingDrawnLineWKT.match(/LINESTRING\s*\(\s*(.+?)\s*\)/i);
                if (lineCoords) {
                  const points = lineCoords[1].split(',').map(p => p.trim());
                  const firstPoint = `POINT(${points[0]})`;
                  const lastPoint = `POINT(${points[points.length - 1]})`;
                  
                  if (!isPointInPolygon(firstPoint, activePolygon.wkt) || 
                      !isPointInPolygon(lastPoint, activePolygon.wkt)) {
                    alert('Line sadece seÃ§ili polygon iÃ§inde Ã§izilebilir!');
                    return;
                  }
                }


                
                const dto = {
                  name: pendingDrawnLineName,
                  wkt: pendingDrawnLineWKT,
                  tip: selectedTip // tip ekle
                };
                axios.post(`/api/point?polygonId=${activePolygonId}` , dto)
                  .then(res => {
                    setWktList(prev => [...prev, {
                      id: res.data.id,
                      wkt: res.data.wkt,
                      name: res.data.name,
                      type: res.data.type,
                      tip: selectedTip,
                    }]);
                    setPendingDrawnLineWKT(null);
                    setPendingDrawnLineName('');
                  })
                  .catch((err) => {
                    alert(err?.response?.data?.mesaj || 'Ã‡izgi eklenirken hata oluÅŸtu!');
                  });
              }}>Kaydet</button>
              <button onClick={()=>{setPendingDrawnLineWKT(null);setPendingDrawnLineName('');}}>Ä°ptal</button>
            </div>
          </div>
        </div>
      )}

      
      {showPolygonOptionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>setShowPolygonOptionModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>Poligon Ekleme YÃ¶ntemi SeÃ§</h3>
            <button style={{width:'100%',marginBottom:10}} onClick={()=>{setShowPolygonOptionModal(false);setShowPolygonModal(true);setSelectedPoint(null);}}>Koordinat Girerek Ekle</button>
            <button style={{width:'100%'}} onClick={()=>{
              setShowPolygonOptionModal(false);
              setEklemeModu('polygon');
              setSelectedPoint(null); // Ekleme moduna girerken bilgi penceresini kapat
            }}>Haritadan TÄ±klayarak Ã‡iz</button>
          </div>
        </div>
      )}

      
      {pendingDrawnPolygonWKT && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>{
              setPendingDrawnPolygonWKT(null);
              setPendingDrawnPolygonName('');
              setEklemeModu(false); // EKLENDÄ°
            }} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>Haritadan Poligon Ekle</h3>
            <p style={{fontSize:12, color:'#888'}}>Poligon WKT: {pendingDrawnPolygonWKT}</p>
            <input
              type="text"
              placeholder="Poligon AdÄ±"
              value={pendingDrawnPolygonName}
              onChange={e => setPendingDrawnPolygonName(e.target.value)}
              style={{width:'100%',marginBottom:10}}
            />
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>{
                if (!pendingDrawnPolygonName.trim()) {
                  alert('Poligon adÄ± girin!');
                  return;
                }
                
                const dto = {
                  name: pendingDrawnPolygonName,
                  wkt: pendingDrawnPolygonWKT
                };
                axios.post('/api/point', dto)
                  .then(res => {
                    setWktList(prev => [...prev, {
                      id: res.data.id,
                      wkt: res.data.wkt,
                      name: res.data.name,
                      type: res.data.type,
                    }]);
                    setPendingDrawnPolygonWKT(null);
                    setPendingDrawnPolygonName('');
                    setEklemeModu(false); // EKLENDÄ°
                  })
                  .catch(() => {
                    alert('Poligon eklenirken hata oluÅŸtu!');
                  });
              }}>Kaydet</button>
              <button onClick={()=>{
                setPendingDrawnPolygonWKT(null);
                setPendingDrawnPolygonName('');
                setEklemeModu(false); // EKLENDÄ°
              }}>Ä°ptal</button>
            </div>
          </div>
        </div>
      )}

      
      {showLineOptionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{position:'relative'}}>
            <button onClick={()=>setShowLineOptionModal(false)} style={{position:'absolute',top:8,right:8,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>Ã—</button>
            <h3>Line Ekleme YÃ¶ntemi SeÃ§</h3>
            <button style={{width:'100%',marginBottom:10}} onClick={()=>{setShowLineOptionModal(false);setShowLineModal(true);setSelectedPoint(null);}}>Koordinat Girerek Ekle</button>
            <button style={{width:'100%'}} onClick={()=>{
              setShowLineOptionModal(false);
              setPendingMapLine([]);
              setEklemeModu('line');
              setSelectedPoint(null); // Ekleme moduna girerken bilgi penceresini kapat
            }}>Haritadan Ekleyerek Ã‡iz</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

