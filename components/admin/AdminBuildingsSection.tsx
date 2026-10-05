'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { useToastStore } from '../../store';

interface FlatUnit {
  id: string;
  buildingId: string;
  floor: number;
  label: string;
  status: 'occupied' | 'vacant' | 'notice-due';
  owner: string;
  resident: string;
  type: string;
  phone: string;
  rentOrMaint: number;
}

interface Building {
  id: string;
  name: string;
  code: string;
  floors: number;
  flatsPerFloor: number;
}

export const AdminBuildingsSection: React.FC = () => {
  const { showToast } = useToastStore();

  const [currentBuildingsTab, setCurrentBuildingsTab] = useState<'towers' | 'unittypes' | 'gates'>('towers');
  const [activeBuildingId, setActiveBuildingId] = useState<string>('tower-a');
  const [current3DViewAngle, setCurrent3DViewAngle] = useState<'view-iso-right' | 'view-axonometric' | 'view-front'>('view-iso-right');
  const [isBuildingDayMode, setIsBuildingDayMode] = useState<boolean>(false);
  const [highlightedFloor, setHighlightedFloor] = useState<number | null>(null);

  const [inspectedFlat, setInspectedFlat] = useState<FlatUnit | null>(null);
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [showAddFlatModal, setShowAddFlatModal] = useState(false);
  const [showUnitTypeModal, setShowUnitTypeModal] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);

  // Buildings data
  const [buildings, setBuildings] = useState<Building[]>([
    { id: 'tower-a', name: 'Tower A (Gulmohar)', code: 'T-A', floors: 5, flatsPerFloor: 4 },
    { id: 'tower-b', name: 'Tower B (Amaltas)', code: 'T-B', floors: 5, flatsPerFloor: 4 },
    { id: 'tower-c', name: 'Tower C (Jacaranda)', code: 'T-C', floors: 4, flatsPerFloor: 4 }
  ]);

  // Unit types data
  const [unitTypes, setUnitTypes] = useState([
    { id: '1', name: '2 BHK Compact', code: '2BHK-C', bedrooms: 2, bathrooms: 2, areaSqFt: 1100, maintenanceMultiplier: 1.0, status: 'Active' },
    { id: '2', name: '3 BHK Standard', code: '3BHK-S', bedrooms: 3, bathrooms: 3, areaSqFt: 1550, maintenanceMultiplier: 1.3, status: 'Active' },
    { id: '3', name: '3.5 BHK Sky Suite', code: '3.5BHK', bedrooms: 3, bathrooms: 4, areaSqFt: 1850, maintenanceMultiplier: 1.5, status: 'Active' },
    { id: '4', name: '4 BHK Duplex Penthouse', code: '4BHK-PH', bedrooms: 4, bathrooms: 5, areaSqFt: 2800, maintenanceMultiplier: 2.2, status: 'Active' }
  ]);

  // Gates data
  const [gates, setGates] = useState([
    { id: '1', name: 'Gate 01 • Main North Entrance', code: 'GATE-01', type: 'Main Entry / ANPR', location: 'North Perimeter near Tower A', operatingHours: '24x7 Open', assignedGuards: ['Ramesh Singh', 'Vikas Yadav'], hardwareStatus: 'Online', status: 'Active' },
    { id: '2', name: 'Gate 02 • South Pedestrian Gate', code: 'GATE-02', type: 'Pedestrian Turnstile', location: 'South Perimeter near Clubhouse', operatingHours: '06:00 AM - 11:00 PM', assignedGuards: ['Manoj Kumar'], hardwareStatus: 'Online', status: 'Active' },
    { id: '3', name: 'Gate 03 • Service & Delivery Terminal', code: 'GATE-03', type: 'Service & Delivery', location: 'West Boundary Logistics Lane', operatingHours: '07:00 AM - 09:00 PM', assignedGuards: ['Suresh Guard'], hardwareStatus: 'Online', status: 'Active' }
  ]);

  // Flats master data
  const [flats, setFlats] = useState<FlatUnit[]>([
    // Tower A (5 floors * 4 flats = 20)
    { id: 'A-101', buildingId: 'tower-a', floor: 1, label: '101', status: 'occupied', owner: 'Aarav Sharma', resident: 'Aarav Sharma', type: '3 BHK', phone: '+91 98200 11001', rentOrMaint: 4500 },
    { id: 'A-102', buildingId: 'tower-a', floor: 1, label: '102', status: 'occupied', owner: 'Priya Mukherjee', resident: 'Priya Mukherjee', type: '2 BHK', phone: '+91 98200 11002', rentOrMaint: 4500 },
    { id: 'A-103', buildingId: 'tower-a', floor: 1, label: '103', status: 'notice-due', owner: 'Ramesh Patel', resident: 'Ramesh Patel', type: '3 BHK', phone: '+91 98200 11003', rentOrMaint: 4500 },
    { id: 'A-104', buildingId: 'tower-a', floor: 1, label: '104', status: 'vacant', owner: 'Sunita Rao', resident: 'Vacant', type: '2 BHK', phone: '+91 98200 11004', rentOrMaint: 4500 },
    { id: 'A-201', buildingId: 'tower-a', floor: 2, label: '201', status: 'occupied', owner: 'Deepak Verma', resident: 'Deepak Verma', type: '3 BHK', phone: '+91 98200 11005', rentOrMaint: 5800 },
    { id: 'A-202', buildingId: 'tower-a', floor: 2, label: '202', status: 'occupied', owner: 'Ananya Iyer', resident: 'Ananya Iyer', type: '2 BHK', phone: '+91 98200 11006', rentOrMaint: 5800 },
    { id: 'A-203', buildingId: 'tower-a', floor: 2, label: '203', status: 'occupied', owner: 'Kavita Menon', resident: 'Kavita Menon', type: '3 BHK', phone: '+91 98200 11007', rentOrMaint: 5800 },
    { id: 'A-204', buildingId: 'tower-a', floor: 2, label: '204', status: 'notice-due', owner: 'Siddharth Roy', resident: 'Siddharth Roy', type: '2 BHK', phone: '+91 98200 11008', rentOrMaint: 5800 },
    { id: 'A-301', buildingId: 'tower-a', floor: 3, label: '301', status: 'occupied', owner: 'Vikram Mehta', resident: 'Vikram Mehta', type: '3 BHK', phone: '+91 98200 11009', rentOrMaint: 4500 },
    { id: 'A-302', buildingId: 'tower-a', floor: 3, label: '302', status: 'occupied', owner: 'Sunita Joshi', resident: 'Sunita Joshi', type: '2 BHK', phone: '+91 98200 11010', rentOrMaint: 4500 },
    { id: 'A-303', buildingId: 'tower-a', floor: 3, label: '303', status: 'vacant', owner: 'Nikhil Desai', resident: 'Vacant', type: '3 BHK', phone: '+91 98200 11011', rentOrMaint: 4500 },
    { id: 'A-304', buildingId: 'tower-a', floor: 3, label: '304', status: 'occupied', owner: 'Rajesh Nair', resident: 'Rajesh Nair', type: '2 BHK', phone: '+91 98200 11012', rentOrMaint: 4500 },
    { id: 'A-401', buildingId: 'tower-a', floor: 4, label: '401', status: 'occupied', owner: 'Sonal Sen', resident: 'Sonal Sen', type: '3 BHK', phone: '+91 98200 11013', rentOrMaint: 5800 },
    { id: 'A-402', buildingId: 'tower-a', floor: 4, label: '402', status: 'occupied', owner: 'Tarun Saxena', resident: 'Tarun Saxena', type: '2 BHK', phone: '+91 98200 11014', rentOrMaint: 5800 },
    { id: 'A-403', buildingId: 'tower-a', floor: 4, label: '403', status: 'occupied', owner: 'Bhavna Kulkarni', resident: 'Bhavna Kulkarni', type: '3 BHK', phone: '+91 98200 11015', rentOrMaint: 5800 },
    { id: 'A-404', buildingId: 'tower-a', floor: 4, label: '404', status: 'notice-due', owner: 'Mohit Bhatia', resident: 'Mohit Bhatia', type: '2 BHK', phone: '+91 98200 11016', rentOrMaint: 5800 },
    { id: 'A-501', buildingId: 'tower-a', floor: 5, label: '501', status: 'occupied', owner: 'Alok Nath', resident: 'Alok Nath', type: 'Penthouse', phone: '+91 98200 11017', rentOrMaint: 8500 },
    { id: 'A-502', buildingId: 'tower-a', floor: 5, label: '502', status: 'occupied', owner: 'Meera Das', resident: 'Meera Das', type: '3 BHK', phone: '+91 98200 11018', rentOrMaint: 8500 },
    { id: 'A-503', buildingId: 'tower-a', floor: 5, label: '503', status: 'vacant', owner: 'Abhinav Tyagi', resident: 'Vacant', type: '3 BHK', phone: '+91 98200 11019', rentOrMaint: 8500 },
    { id: 'A-504', buildingId: 'tower-a', floor: 5, label: '504', status: 'occupied', owner: 'Smita Bansal', resident: 'Smita Bansal', type: 'Penthouse', phone: '+91 98200 11020', rentOrMaint: 8500 },

    // Tower B (5 floors * 4 flats = 20)
    { id: 'B-101', buildingId: 'tower-b', floor: 1, label: '101', status: 'occupied', owner: 'Vikas Dubey', resident: 'Vikas Dubey', type: '3 BHK', phone: '+91 98200 22001', rentOrMaint: 4500 },
    { id: 'B-102', buildingId: 'tower-b', floor: 1, label: '102', status: 'occupied', owner: 'Nandini Das', resident: 'Nandini Das', type: '2 BHK', phone: '+91 98200 22002', rentOrMaint: 4500 },
    { id: 'B-103', buildingId: 'tower-b', floor: 1, label: '103', status: 'vacant', owner: 'Rohit Aggarwal', resident: 'Vacant', type: '3 BHK', phone: '+91 98200 22003', rentOrMaint: 4500 },
    { id: 'B-104', buildingId: 'tower-b', floor: 1, label: '104', status: 'occupied', owner: 'Leela Reddy', resident: 'Leela Reddy', type: '2 BHK', phone: '+91 98200 22004', rentOrMaint: 4500 },
    { id: 'B-201', buildingId: 'tower-b', floor: 2, label: '201', status: 'occupied', owner: 'Gautam Singhania', resident: 'Gautam Singhania', type: '3 BHK', phone: '+91 98200 22005', rentOrMaint: 5800 },
    { id: 'B-202', buildingId: 'tower-b', floor: 2, label: '202', status: 'notice-due', owner: 'Isha Mehra', resident: 'Isha Mehra', type: '2 BHK', phone: '+91 98200 22006', rentOrMaint: 5800 },
    { id: 'B-203', buildingId: 'tower-b', floor: 2, label: '203', status: 'occupied', owner: 'Tanmay Bhatt', resident: 'Tanmay Bhatt', type: '3 BHK', phone: '+91 98200 22007', rentOrMaint: 5800 },
    { id: 'B-204', buildingId: 'tower-b', floor: 2, label: '204', status: 'occupied', owner: 'Divya Dutta', resident: 'Divya Dutta', type: '2 BHK', phone: '+91 98200 22008', rentOrMaint: 5800 },
    { id: 'B-301', buildingId: 'tower-b', floor: 3, label: '301', status: 'occupied', owner: 'Varun Grover', resident: 'Varun Grover', type: '3 BHK', phone: '+91 98200 22009', rentOrMaint: 4500 },
    { id: 'B-302', buildingId: 'tower-b', floor: 3, label: '302', status: 'vacant', owner: 'Kunal Kapoor', resident: 'Vacant', type: '2 BHK', phone: '+91 98200 22010', rentOrMaint: 4500 },
    { id: 'B-303', buildingId: 'tower-b', floor: 3, label: '303', status: 'occupied', owner: 'Meera Rao', resident: 'Meera Rao', type: '3 BHK', phone: '+91 98200 22011', rentOrMaint: 5800 },
    { id: 'B-304', buildingId: 'tower-b', floor: 3, label: '304', status: 'occupied', owner: 'Chetan Bhagat', resident: 'Chetan Bhagat', type: '2 BHK', phone: '+91 98200 22012', rentOrMaint: 5800 },
    { id: 'B-401', buildingId: 'tower-b', floor: 4, label: '401', status: 'occupied', owner: 'Suresh Menon', resident: 'Suresh Menon', type: '3 BHK', phone: '+91 98200 22013', rentOrMaint: 5800 },
    { id: 'B-402', buildingId: 'tower-b', floor: 4, label: '402', status: 'occupied', owner: 'Sonia Kapadia', resident: 'Sonia Kapadia', type: '2 BHK', phone: '+91 98200 22014', rentOrMaint: 5800 },
    { id: 'B-403', buildingId: 'tower-b', floor: 4, label: '403', status: 'occupied', owner: 'Sameer Nair', resident: 'Sameer Nair', type: '3 BHK', phone: '+91 98200 22015', rentOrMaint: 5800 },
    { id: 'B-404', buildingId: 'tower-b', floor: 4, label: '404', status: 'occupied', owner: 'Ritika Roy', resident: 'Ritika Roy', type: '2 BHK', phone: '+91 98200 22016', rentOrMaint: 5800 },
    { id: 'B-501', buildingId: 'tower-b', floor: 5, label: '501', status: 'occupied', owner: 'Aditya Birla', resident: 'Aditya Birla', type: 'Penthouse', phone: '+91 98200 22017', rentOrMaint: 8500 },
    { id: 'B-502', buildingId: 'tower-b', floor: 5, label: '502', status: 'occupied', owner: 'Kareena Kapoor', resident: 'Kareena Kapoor', type: '3 BHK', phone: '+91 98200 22018', rentOrMaint: 8500 },
    { id: 'B-503', buildingId: 'tower-b', floor: 5, label: '503', status: 'occupied', owner: 'Saif Khan', resident: 'Saif Khan', type: '3 BHK', phone: '+91 98200 22019', rentOrMaint: 8500 },
    { id: 'B-504', buildingId: 'tower-b', floor: 5, label: '504', status: 'occupied', owner: 'Rishi Rich', resident: 'Rishi Rich', type: 'Penthouse', phone: '+91 98200 22020', rentOrMaint: 8500 },

    // Tower C (4 floors * 4 flats = 16)
    { id: 'C-101', buildingId: 'tower-c', floor: 1, label: '101', status: 'occupied', owner: 'Amitav Ghosh', resident: 'Amitav Ghosh', type: '2 BHK', phone: '+91 98200 33001', rentOrMaint: 4500 },
    { id: 'C-102', buildingId: 'tower-c', floor: 1, label: '102', status: 'occupied', owner: 'Radhika Apte', resident: 'Radhika Apte', type: '2 BHK', phone: '+91 98200 33002', rentOrMaint: 4500 },
    { id: 'C-103', buildingId: 'tower-c', floor: 1, label: '103', status: 'occupied', owner: 'Chetan Bhagat', resident: 'Chetan Bhagat', type: '2 BHK', phone: '+91 98200 33003', rentOrMaint: 4500 },
    { id: 'C-104', buildingId: 'tower-c', floor: 1, label: '104', status: 'notice-due', owner: 'Zoya Akhtar', resident: 'Zoya Akhtar', type: '2 BHK', phone: '+91 98200 33004', rentOrMaint: 4500 },
    { id: 'C-201', buildingId: 'tower-c', floor: 2, label: '201', status: 'occupied', owner: 'Karan Johar', resident: 'Karan Johar', type: '2 BHK', phone: '+91 98200 33005', rentOrMaint: 4500 },
    { id: 'C-202', buildingId: 'tower-c', floor: 2, label: '202', status: 'occupied', owner: 'Shraddha Kapoor', resident: 'Shraddha Kapoor', type: '2 BHK', phone: '+91 98200 33006', rentOrMaint: 4500 },
    { id: 'C-203', buildingId: 'tower-c', floor: 2, label: '203', status: 'vacant', owner: 'Rajkummar Rao', resident: 'Vacant', type: '2 BHK', phone: '+91 98200 33007', rentOrMaint: 4500 },
    { id: 'C-204', buildingId: 'tower-c', floor: 2, label: '204', status: 'occupied', owner: 'Ayushmann Khurrana', resident: 'Ayushmann Khurrana', type: '2 BHK', phone: '+91 98200 33008', rentOrMaint: 4500 },
    { id: 'C-301', buildingId: 'tower-c', floor: 3, label: '301', status: 'occupied', owner: 'Shahid Kapoor', resident: 'Shahid Kapoor', type: '2 BHK', phone: '+91 98200 33009', rentOrMaint: 4500 },
    { id: 'C-302', buildingId: 'tower-c', floor: 3, label: '302', status: 'occupied', owner: 'Mira Rajput', resident: 'Mira Rajput', type: '2 BHK', phone: '+91 98200 33010', rentOrMaint: 4500 },
    { id: 'C-303', buildingId: 'tower-c', floor: 3, label: '303', status: 'occupied', owner: 'Pankaj Tripathi', resident: 'Pankaj Tripathi', type: '2 BHK', phone: '+91 98200 33011', rentOrMaint: 4500 },
    { id: 'C-304', buildingId: 'tower-c', floor: 3, label: '304', status: 'occupied', owner: 'Manoj Bajpayee', resident: 'Manoj Bajpayee', type: '2 BHK', phone: '+91 98200 33012', rentOrMaint: 4500 },
    { id: 'C-401', buildingId: 'tower-c', floor: 4, label: '401', status: 'occupied', owner: 'Nawazuddin Siddiqui', resident: 'Nawazuddin Siddiqui', type: '3 BHK', phone: '+91 98200 33013', rentOrMaint: 5800 },
    { id: 'C-402', buildingId: 'tower-c', floor: 4, label: '402', status: 'occupied', owner: 'Tabu Hashmi', resident: 'Tabu Hashmi', type: '3 BHK', phone: '+91 98200 33014', rentOrMaint: 5800 },
    { id: 'C-403', buildingId: 'tower-c', floor: 4, label: '403', status: 'vacant', owner: 'Vicky Kaushal', resident: 'Vacant', type: '3 BHK', phone: '+91 98200 33015', rentOrMaint: 5800 },
    { id: 'C-404', buildingId: 'tower-c', floor: 4, label: '404', status: 'occupied', owner: 'Katrina Kaif', resident: 'Katrina Kaif', type: '3 BHK', phone: '+91 98200 33016', rentOrMaint: 5800 }
  ]);

  const activeBuilding = buildings.find((b) => b.id === activeBuildingId) || buildings[0];
  const activeFlats = flats.filter((f) => f.buildingId === activeBuildingId);

  const occCount = activeFlats.filter((f) => f.status === 'occupied').length;
  const vacCount = activeFlats.filter((f) => f.status === 'vacant').length;
  const dueCount = activeFlats.filter((f) => f.status === 'notice-due').length;
  const occRate = Math.round((occCount / (activeFlats.length || 1)) * 100);

  // Slices generation from top floor to floor 1
  const floorNumbers = Array.from({ length: activeBuilding.floors }, (_, i) => activeBuilding.floors - i);

  return (
    <section className="admin-section active" id="section-buildings">
      {/* Section Header */}
      <div className="section-header">
        <div>
          <h2>Society Architecture & Infrastructure</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            Configure towers, unit types, and perimeter gate terminals.
          </p>
        </div>
        <div className="section-actions" id="buildings-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddBuildingModal(true)}>
            + Add Building
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddFlatModal(true)}>
            + Add Flat
          </button>
        </div>
      </div>

      {/* Module Subnav Bar */}
      <div className="module-subnav">
        <button
          type="button"
          className={clsx('module-tab-btn', currentBuildingsTab === 'towers' && 'active')}
          onClick={() => setCurrentBuildingsTab('towers')}
        >
          Towers & Unit Slices
        </button>
        <button
          type="button"
          className={clsx('module-tab-btn', currentBuildingsTab === 'unittypes' && 'active')}
          onClick={() => setCurrentBuildingsTab('unittypes')}
        >
          Unit Types & Sizing
        </button>
        <button
          type="button"
          className={clsx('module-tab-btn', currentBuildingsTab === 'gates' && 'active')}
          onClick={() => setCurrentBuildingsTab('gates')}
        >
          Gates & Security Terminals
        </button>
      </div>

      {/* TAB 1: 3D Towers & Unit Slices */}
      {currentBuildingsTab === 'towers' && (
        <div className="config-panel active" id="bldgtab-towers">
          {/* Summary Chips */}
          <div className="building-summary-chips" id="building-summary">
            <span className="badge badge-pine">Occupied: {occCount}</span>
            <span className="badge badge-neutral">Vacant: {vacCount}</span>
            <span className="badge badge-warning">Notice / Dues Pending: {dueCount}</span>
            <span className="badge badge-success">{occRate}% Occupancy Rate</span>
          </div>

          {/* Tower Selector Tabs */}
          <div className="building-tabs" id="building-tabs">
            {buildings.map((b) => (
              <button
                key={b.id}
                type="button"
                className={clsx('tab-btn', b.id === activeBuildingId && 'active')}
                onClick={() => setActiveBuildingId(b.id)}
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Split Visual View: 3D Model on Left + Floor Plates Matrix on Right */}
          <div className="building-split-view">
            {/* LEFT: 3D Isometric Architectural Elevation Stage */}
            <div className={clsx('tower-stage-card', isBuildingDayMode && 'day-mode')} id="tower-visual-model">
              {/* Viewport Controls Bar */}
              <div className="viewport-controls-bar">
                <div className="view-angle-btns">
                  <button
                    type="button"
                    className={clsx('angle-btn', current3DViewAngle === 'view-iso-right' && 'active')}
                    onClick={() => setCurrent3DViewAngle('view-iso-right')}
                  >
                    Isometric 3D
                  </button>
                  <button
                    type="button"
                    className={clsx('angle-btn', current3DViewAngle === 'view-axonometric' && 'active')}
                    onClick={() => setCurrent3DViewAngle('view-axonometric')}
                  >
                    Axonometric
                  </button>
                  <button
                    type="button"
                    className={clsx('angle-btn', current3DViewAngle === 'view-front' && 'active')}
                    onClick={() => setCurrent3DViewAngle('view-front')}
                  >
                    Front Elevation
                  </button>
                </div>
                <div
                  className="day-night-toggle"
                  onClick={() => setIsBuildingDayMode((prev) => !prev)}
                >
                  <span>{isBuildingDayMode ? 'Day View' : 'Night Illumination'}</span>
                </div>
              </div>

              {/* 3D Scene Viewport */}
              <div className="tower-3d-scene">
                {/* Central Panoramic Glass Elevator Shaft */}
                <div className="central-glass-elevator-shaft">
                  <div className="elevator-moving-pod"></div>
                </div>

                {/* Isometric Rig Transform */}
                <div className={clsx('tower-isometric-rig', current3DViewAngle)} id="towerRig">
                  {/* Architectural Rooftop */}
                  <div className="architectural-roof">
                    <div className="solar-grid-array" title="Grid-tied Solar PV Array (25 kWp)">
                      <div className="solar-cell"></div>
                      <div className="solar-cell"></div>
                      <div className="solar-cell"></div>
                      <div className="solar-cell"></div>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#a7f3d0' }}>
                      SKY TERRACE & LOUNGE
                    </div>
                    <div className="roof-water-tank">TANK 01</div>
                  </div>

                  {/* Floor Slices (Top to Bottom) */}
                  {floorNumbers.map((floorNum) => {
                    const floorFlats = activeFlats.filter((f) => f.floor === floorNum);
                    const isPenthouse = floorNum === activeBuilding.floors && activeBuilding.floors >= 5;
                    const isHighlighted = highlightedFloor === floorNum;

                    return (
                      <div
                        key={floorNum}
                        className={clsx('architectural-floor-slice', isHighlighted && 'active-slice')}
                        id={`slab-${floorNum}`}
                        onMouseEnter={() => setHighlightedFloor(floorNum)}
                        onMouseLeave={() => setHighlightedFloor(null)}
                      >
                        <div className="floor-slab-base">
                          <span className="floor-number-callout">
                            {isPenthouse ? `F${floorNum} PH` : `LEVEL ${floorNum}`}
                          </span>
                          <div className="units-facade-row">
                            {floorFlats.map((f) => (
                              <div
                                key={f.id}
                                className={`realistic-window-unit unit-${f.status}`}
                                title={`Flat ${f.id} • ${f.owner} (${f.status})`}
                                onClick={() => setInspectedFlat(f)}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="unit-label-text">{f.label}</span>
                                  <span style={{ fontSize: '0.5rem', opacity: 0.8 }}>
                                    {f.type.split(' ')[0]}
                                  </span>
                                </div>
                                <div className="balcony-glass-strip"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Ground Podium & Main Entrance */}
                  <div className="architectural-ground-podium">
                    <div className="podium-canopy-text">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      <span>{activeBuilding.name.toUpperCase()} MAIN ENTRANCE</span>
                    </div>
                    <span className="security-kiosk-badge">BOOTH ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Legend Bar */}
              <div className="stage-arch-legend">
                <div className="stage-arch-legend-items">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }}></span>
                    <span>Occupied</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}></span>
                    <span>Vacant</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--saffron)', boxShadow: '0 0 6px var(--saffron)' }}></span>
                    <span>Notice Due</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.625rem', opacity: 0.8 }}>Click unit to inspect resident</span>
              </div>
            </div>

            {/* RIGHT: Floor Plates & Unit Matrix */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.05rem' }}>{activeBuilding.name} — Floor Slices</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                  Hover floor slab to highlight on 3D tower
                </span>
              </div>

              <div className="floors-stack">
                {floorNumbers.map((floorNum) => {
                  const floorFlats = activeFlats.filter((f) => f.floor === floorNum);
                  return (
                    <div
                      key={floorNum}
                      className={clsx('floor-row', highlightedFloor === floorNum && 'active-row')}
                      onMouseEnter={() => setHighlightedFloor(floorNum)}
                      onMouseLeave={() => setHighlightedFloor(null)}
                    >
                      <span className="floor-label">Floor {floorNum}</span>
                      <div className="flats-list">
                        {floorFlats.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className={`flat-chip ${f.status}`}
                            onClick={() => setInspectedFlat(f)}
                          >
                            <span className="status-dot"></span>
                            <span>Flat {f.label}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({f.type})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Unit Types & Sizing */}
      {currentBuildingsTab === 'unittypes' && (
        <div className="config-panel active" id="bldgtab-unittypes">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Unit Configuration & Area Multipliers</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Define apartment configurations, carpet areas, and maintenance calculation multipliers.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowUnitTypeModal(true)}>
              + Add Unit Type
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Unit Type</th>
                  <th>Code</th>
                  <th>Bedrooms</th>
                  <th>Bathrooms</th>
                  <th>Super Area (sq.ft.)</th>
                  <th>Maint. Multiplier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unitTypes.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.name}</strong></td>
                    <td><code style={{ fontWeight: 700, color: 'var(--pine)' }}>{u.code}</code></td>
                    <td>{u.bedrooms} BHK</td>
                    <td>{u.bathrooms} Bath</td>
                    <td>{u.areaSqFt.toLocaleString('en-IN')} sq.ft.</td>
                    <td><span className="badge badge-pine">{u.maintenanceMultiplier.toFixed(2)}x Base</span></td>
                    <td><span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>{u.status}</span></td>
                    <td>
                      <div className="table-action-btns">
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => {
                            setUnitTypes((prev) =>
                              prev.map((item) =>
                                item.id === u.id
                                  ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' }
                                  : item
                              )
                            );
                            showToast(`Unit type ${u.name} toggled.`);
                          }}
                        >
                          Toggle
                        </button>
                        <button className="btn btn-xs btn-ghost" onClick={() => showToast(`Edit ${u.name}`)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Gates & Security Terminals */}
      {currentBuildingsTab === 'gates' && (
        <div className="config-panel active" id="bldgtab-gates">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Perimeter Gates & ANPR Boom Barriers</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Configure physical entry points, operational timings, and guard post allocations.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowGateModal(true)}>
              + Add Gate Terminal
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Gate Name</th>
                  <th>Gate Code</th>
                  <th>Gate Type</th>
                  <th>Physical Location</th>
                  <th>Operating Hours</th>
                  <th>Assigned Guards</th>
                  <th>Hardware / ANPR</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gates.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.name}</strong></td>
                    <td><code style={{ fontWeight: 700, color: 'var(--pine)' }}>{g.code}</code></td>
                    <td><span className="badge badge-pine">{g.type}</span></td>
                    <td>{g.location}</td>
                    <td>{g.operatingHours}</td>
                    <td>{g.assignedGuards.join(', ')}</td>
                    <td>
                      <span className={`badge ${g.hardwareStatus === 'Online' ? 'badge-success' : 'badge-warning'}`}>
                        ● {g.hardwareStatus}
                      </span>
                    </td>
                    <td><span className="badge badge-success">{g.status}</span></td>
                    <td>
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => showToast(`Gate ${g.name} status updated.`)}
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspected Flat Modal / Drawer */}
      {inspectedFlat && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedFlat(null);
          }}
        >
          <div
            className="modal-dialog"
            style={{ maxWidth: '500px', borderRadius: '16px', padding: '20px' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--pine-tint)', color: 'var(--pine)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                    Unit Dossier: Flat {inspectedFlat.id}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--neutral)', margin: 0 }}>
                    {inspectedFlat.type} • Floor {inspectedFlat.floor} • {activeBuilding.name}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectedFlat(null)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', fontSize: '0.8125rem' }}>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>REGISTERED OWNER</span>
                <strong style={{ color: 'var(--ink)' }}>{inspectedFlat.owner}</strong>
              </div>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>CURRENT RESIDENT</span>
                <strong style={{ color: 'var(--ink)' }}>{inspectedFlat.resident}</strong>
              </div>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>PHONE NUMBER</span>
                <strong>{inspectedFlat.phone}</strong>
              </div>
              <div style={{ background: 'var(--surface-sunken)', padding: '10px', borderRadius: '8px' }}>
                <span style={{ color: 'var(--neutral)', display: 'block', fontSize: '0.6875rem', fontWeight: 600 }}>OCCUPANCY STATUS</span>
                <span className={`badge badge-${inspectedFlat.status === 'occupied' ? 'success' : inspectedFlat.status === 'notice-due' ? 'warning' : 'neutral'}`}>
                  {inspectedFlat.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  showToast(`WhatsApp notice dispatched to ${inspectedFlat.owner} (${inspectedFlat.id})`);
                  setInspectedFlat(null);
                }}
              >
                WhatsApp Notice
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => setInspectedFlat(null)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Building */}
      {showAddBuildingModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Society Tower Building</h3>
              <button className="modal-close-btn" onClick={() => setShowAddBuildingModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Building Name</label>
                <input type="text" className="form-control" placeholder="e.g. Tower D (Palash)" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Floors</label>
                  <input type="number" className="form-control" defaultValue="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Flats Per Floor</label>
                  <input type="number" className="form-control" defaultValue="4" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddBuildingModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('New building tower added to campus architecture!');
                  setShowAddBuildingModal(false);
                }}
              >
                Create Tower
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Flat */}
      {showAddFlatModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Register New Unit Flat</h3>
              <button className="modal-close-btn" onClick={() => setShowAddFlatModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Select Tower</label>
                  <select className="form-select" defaultValue="tower-a">
                    <option value="tower-a">Tower A (Gulmohar)</option>
                    <option value="tower-b">Tower B (Amaltas)</option>
                    <option value="tower-c">Tower C (Jacaranda)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Number</label>
                  <input type="text" className="form-control" placeholder="e.g. 505" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Owner Full Name</label>
                <input type="text" className="form-control" placeholder="e.g. Ratan Tata" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddFlatModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('New flat unit registered.');
                  setShowAddFlatModal(false);
                }}
              >
                Save Flat Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Unit Type */}
      {showUnitTypeModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Unit Type Configuration</h3>
              <button className="modal-close-btn" onClick={() => setShowUnitTypeModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Unit Type Name</label>
                <input type="text" className="form-control" placeholder="e.g. 5 BHK Presidential Suite" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Super Built-up Area (sq.ft.)</label>
                  <input type="number" className="form-control" defaultValue="3200" />
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance Multiplier</label>
                  <input type="number" step="0.1" className="form-control" defaultValue="2.5" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUnitTypeModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('New unit sizing configuration registered.');
                  setShowUnitTypeModal(false);
                }}
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Gate */}
      {showGateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Add Perimeter Gate Terminal</h3>
              <button className="modal-close-btn" onClick={() => setShowGateModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Gate Name</label>
                <input type="text" className="form-control" placeholder="e.g. Gate 04 • West Exit" />
              </div>
              <div className="form-group">
                <label className="form-label">Physical Campus Location</label>
                <input type="text" className="form-control" placeholder="e.g. West Boundary Logistics Lane" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowGateModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('Perimeter gate registered.');
                  setShowGateModal(false);
                }}
              >
                Register Gate
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
