import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import { Map, View } from 'ol';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { Vector as VectorSource } from 'ol/source';
import WKT from 'ol/format/WKT';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { Draw } from 'ol/interaction';
import { toLonLat } from 'ol/proj';

const MapComponent = ({ wktList, setSelectedPoint, isAddingPoint, onNewPoint, isAddingLine, onNewLinePoint, onNewLineWKT, isAddingPolygon, onNewPolygonWKT }) => {
  const mapRef = useRef();
  const mapInstance = useRef();
  const drawRef = useRef(null); 
  const lineClickHandlerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    
    if (!mapInstance.current) {
      mapInstance.current = new Map({
        target: mapRef.current,
        layers: [], // Katmanları aşağıda ekleyeceğiz
        view: new View({ center: [0, 0], zoom: 2 }),
      });
    }
    const map = mapInstance.current;

    
    map.getLayers().clear();

    const vectorSource = new VectorSource();
    wktList.forEach((item, index) => {
      const format = new WKT();
      const feature = format.readFeature(item.wkt, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      });
      feature.setId(item.id || `id_${index}`);
      feature.set('name', item.name || `Nokta ${index}`);
      feature.set('wkt', item.wkt);
      feature.set('type', item.type || 'Point');
      feature.set('tip', item.tip || null);
      vectorSource.addFeature(feature);
    });

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => {
        const geometry = feature.getGeometry();
        const type = geometry.getType();
        if (type === 'Point') {
          return new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: 'rgb(108,46,183)' }),
              stroke: new Stroke({ color: 'white', width: 2 }),
            }),
          });
        } else if (type === 'LineString') {
          return new Style({
            stroke: new Stroke({ color: 'rgb(108,46,183)', width: 3 }),
          });
        } else if (type === 'Polygon') {
          return new Style({
            stroke: new Stroke({ color: 'rgb(108,46,183)', width: 2 }),
            fill: new Fill({ color: 'rgba(108,46,183,0.2)' }),
          });
        }
      },
    });

    map.addLayer(new TileLayer({ source: new OSM() }));
    map.addLayer(vectorLayer);

    if (isAddingPoint) {
      drawRef.current = new Draw({ source: vectorSource, type: 'Point' });
      map.addInteraction(drawRef.current);
      drawRef.current.on('drawend', (event) => {
        const drawnFeature = event.feature;
        const geometry = drawnFeature.getGeometry();
        const wkt = new WKT().writeGeometry(geometry.transform('EPSG:3857', 'EPSG:4326'));
        if (onNewPoint) onNewPoint(wkt);
        map.removeInteraction(drawRef.current);
        drawRef.current = null;
      });
    } else if (isAddingLine) {
      drawRef.current = new Draw({ source: vectorSource, type: 'LineString', maxPoints: 2 });
      map.addInteraction(drawRef.current);
      drawRef.current.on('drawend', (event) => {
        const geometry = event.feature.getGeometry();
        const wkt = new WKT().writeGeometry(geometry.transform('EPSG:3857', 'EPSG:4326'));
        if (onNewLineWKT) onNewLineWKT(wkt);
        map.removeInteraction(drawRef.current);
        drawRef.current = null;
      });
    } else if (isAddingPolygon) {
      drawRef.current = new Draw({ source: vectorSource, type: 'Polygon' });
      map.addInteraction(drawRef.current);
      drawRef.current.on('drawend', (event) => {
        const geometry = event.feature.getGeometry();
        const wkt = new WKT().writeGeometry(geometry.transform('EPSG:3857', 'EPSG:4326'));
        if (onNewPolygonWKT) onNewPolygonWKT(wkt);
        map.removeInteraction(drawRef.current);
        drawRef.current = null;
      });
    } else {
      const clickHandler = (evt) => {
        let foundPoint = null;
        let foundOther = null;
        map.forEachFeatureAtPixel(evt.pixel, (feature) => {
          const type = feature.get('type');
          if (type === 'Point' && !foundPoint) {
            foundPoint = feature;
          } else if (!foundOther) {
            foundOther = feature;
          }
        });
        const feature = foundPoint || foundOther;
        if (feature) {
          const properties = feature.getProperties();
          const geometry = feature.getGeometry();
          const geometryType = geometry.getType();
          const coordinates = geometryType === 'Point' ? geometry.getCoordinates() : geometry.getFirstCoordinate();
          let distance = null;
          if (geometryType === 'LineString') {
            const coords = geometry.getCoordinates();
            const lonLat1 = coords[0];
            const lonLat2 = coords[1];
            const toRad = (value) => (value * Math.PI) / 180;
            const R = 6371;
            const lat1 = lonLat1[1], lon1 = lonLat1[0];
            const lat2 = lonLat2[1], lon2 = lonLat2[0];
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance = R * c;
          }
          setSelectedPoint({
            id: feature.getId(),
            name: properties.name,
            wkt: properties.wkt,
            coordinates,
            type: geometryType,
            tip: properties.tip || null,
            distance: distance?.toFixed(2) || null,
          });
        } else {
          setSelectedPoint(null);
        }
      };
      map.on('click', clickHandler);
      // Temizlik fonksiyonunda kaldır
      return () => {
        if (drawRef.current) {
          map.removeInteraction(drawRef.current);
          drawRef.current = null;
        }
        map.un('click', clickHandler);
        if (lineClickHandlerRef.current && map) {
          map.un('click', lineClickHandlerRef.current);
          lineClickHandlerRef.current = null;
        }
      };
    }
  }, [wktList, isAddingPoint, isAddingLine, isAddingPolygon, onNewPoint, onNewLinePoint, onNewLineWKT, onNewPolygonWKT, setSelectedPoint]);

  return <div ref={mapRef} style={{ width: '100%', height: '650px' }} />;
};

export default MapComponent;
