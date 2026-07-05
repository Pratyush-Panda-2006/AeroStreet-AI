// ============================================
// IndianAQI — Demo Data
// ============================================
// Expanded demo data for Indian states and districts
// to support interactive map drills.

export const DEMO_HOTSPOTS = [
  {
    id: 'hs-delhi',
    name: 'Delhi',
    state: 'Delhi',
    aqi: 345,
    coordinates: { lat: 28.6139, lng: 77.2090 },
    mapPosition: { top: '30%', left: '45%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 250, unit: 'µg/m³' },
      { name: 'PM10', value: 380, unit: 'µg/m³' },
      { name: 'NO2', value: 85, unit: 'ppb' },
      { name: 'O3', value: 60, unit: 'ppb' },
    ],
  },
  {
    id: 'hs-mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    aqi: 142,
    coordinates: { lat: 19.0760, lng: 72.8777 },
    mapPosition: { top: '60%', left: '35%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 65, unit: 'µg/m³' },
      { name: 'NO2', value: 45, unit: 'ppb' },
      { name: 'SO2', value: 18, unit: 'ppb' },
    ],
  },
  {
    id: 'hs-bangalore',
    name: 'Bangalore',
    state: 'Karnataka',
    aqi: 55,
    coordinates: { lat: 12.9716, lng: 77.5946 },
    mapPosition: { top: '75%', left: '42%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 30, unit: 'µg/m³' },
      { name: 'PM10', value: 48, unit: 'µg/m³' },
      { name: 'O3', value: 25, unit: 'ppb' },
    ],
  },
  {
    id: 'hs-gurugram',
    name: 'Gurugram',
    state: 'Haryana',
    aqi: 290,
    coordinates: { lat: 28.4595, lng: 77.0266 },
    mapPosition: { top: '32%', left: '43%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 195, unit: 'µg/m³' },
      { name: 'NO2', value: 72, unit: 'ppb' },
    ],
  },
  {
    id: 'hs-pune',
    name: 'Pune',
    state: 'Maharashtra',
    aqi: 112,
    coordinates: { lat: 18.5204, lng: 73.8567 },
    mapPosition: { top: '62%', left: '37%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 55, unit: 'µg/m³' },
      { name: 'PM10', value: 95, unit: 'µg/m³' },
    ],
  },
  {
    id: 'hs-kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    aqi: 178,
    coordinates: { lat: 22.5726, lng: 88.3639 },
    mapPosition: { top: '48%', left: '68%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 98, unit: 'µg/m³' },
      { name: 'NO2', value: 58, unit: 'ppb' },
    ],
  },
  {
    id: 'hs-aizawl',
    name: 'Aizawl',
    state: 'Mizoram',
    aqi: 22,
    coordinates: { lat: 23.7271, lng: 92.7176 },
    mapPosition: { top: '45%', left: '78%' },
    source: 'sensor',
    pollutants: [
      { name: 'PM2.5', value: 12, unit: 'µg/m³' },
    ],
  },
  {
    id: 'hs-cctv-1',
    name: 'CCTV: Smoke Alert',
    state: 'Delhi',
    aqi: 400,
    coordinates: { lat: 28.5900, lng: 77.2300 },
    mapPosition: { top: '31%', left: '46.5%' },
    source: 'CCTV_Alert',
    pollutants: [
      { name: 'Detection', value: 'Heavy Smoke', unit: '' },
      { name: 'Confidence', value: '94%', unit: '' },
    ],
  },
  {
    id: 'hs-cctv-2',
    name: 'CCTV: Litter Dump',
    state: 'Mumbai',
    aqi: 200,
    coordinates: { lat: 19.0500, lng: 72.8900 },
    mapPosition: { top: '61%', left: '36%' },
    source: 'CCTV_Alert',
    pollutants: [
      { name: 'Detection', value: 'Illegal Dumping', unit: '' },
      { name: 'Confidence', value: '87%', unit: '' },
    ],
  },
];

// List of all states in India with their average AQI for national overview
export const DEMO_STATES = [
  { id: 'in-jk', name: 'Jammu & Kashmir', aqi: 72, capital: 'Srinagar' },
  { id: 'in-hp', name: 'Himachal Pradesh', aqi: 65, capital: 'Shimla' },
  { id: 'in-pb', name: 'Punjab', aqi: 185, capital: 'Chandigarh' },
  { id: 'in-ut', name: 'Uttarakhand', aqi: 82, capital: 'Dehradun' },
  { id: 'in-hr', name: 'Haryana', aqi: 240, capital: 'Chandigarh' },
  { id: 'in-dl', name: 'Delhi', aqi: 342, capital: 'New Delhi' },
  { id: 'in-rj', name: 'Rajasthan', aqi: 155, capital: 'Jaipur' },
  { id: 'in-up', name: 'Uttar Pradesh', aqi: 260, capital: 'Lucknow' },
  { id: 'in-gj', name: 'Gujarat', aqi: 85, capital: 'Gandhinagar' },
  { id: 'in-mp', name: 'Madhya Pradesh', aqi: 130, capital: 'Bhopal' },
  { id: 'in-mh', name: 'Maharashtra', aqi: 125, capital: 'Mumbai' },
  { id: 'in-ka', name: 'Karnataka', aqi: 45, capital: 'Bengaluru' },
  { id: 'in-kl', name: 'Kerala', aqi: 38, capital: 'Thiruvananthapuram' },
  { id: 'in-tn', name: 'Tamil Nadu', aqi: 52, capital: 'Chennai' },
  { id: 'in-ap', name: 'Andhra Pradesh', aqi: 58, capital: 'Amaravati' },
  { id: 'in-tg', name: 'Telangana', aqi: 75, capital: 'Hyderabad' },
  { id: 'in-ct', name: 'Chhattisgarh', aqi: 120, capital: 'Raipur' },
  { id: 'in-or', name: 'Odisha', aqi: 88, capital: 'Bhubaneswar' },
  { id: 'in-br', name: 'Bihar', aqi: 210, capital: 'Patna' },
  { id: 'in-jh', name: 'Jharkhand', aqi: 145, capital: 'Ranchi' },
  { id: 'in-wb', name: 'West Bengal', aqi: 156, capital: 'Kolkata' },
  { id: 'in-sk', name: 'Sikkim', aqi: 28, capital: 'Gangtok' },
  { id: 'in-as', name: 'Assam', aqi: 74, capital: 'Dispur' },
  { id: 'in-ar', name: 'Arunachal Pradesh', aqi: 25, capital: 'Itanagar' },
  { id: 'in-nl', name: 'Nagaland', aqi: 32, capital: 'Kohima' },
  { id: 'in-mn', name: 'Manipur', aqi: 35, capital: 'Imphal' },
  { id: 'in-mz', name: 'Mizoram', aqi: 22, capital: 'Aizawl' },
  { id: 'in-tr', name: 'Tripura', aqi: 48, capital: 'Agartala' },
  { id: 'in-ml', name: 'Meghalaya', aqi: 30, capital: 'Shillong' },
  { id: 'in-go', name: 'Goa', aqi: 42, capital: 'Panaji' },
];

// District mapping when clicking on a specific state
export const DEMO_DISTRICTS_BY_STATE = {
  'in-wb': [
    { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', aqi: 178, coordinates: { lat: 22.5726, lng: 88.3639 }, pollutants: [{ name: 'PM2.5', value: 98, unit: 'µg/m³' }] },
    { id: 'howrah', name: 'Howrah', state: 'West Bengal', aqi: 190, coordinates: { lat: 22.5958, lng: 88.2636 }, pollutants: [{ name: 'PM2.5', value: 110, unit: 'µg/m³' }] },
    { id: 'hooghly', name: 'Hooghly', state: 'West Bengal', aqi: 145, coordinates: { lat: 22.9012, lng: 88.3883 }, pollutants: [{ name: 'PM2.5', value: 68, unit: 'µg/m³' }] },
    { id: 'darjeeling', name: 'Darjeeling', state: 'West Bengal', aqi: 65, coordinates: { lat: 27.0410, lng: 88.2627 }, pollutants: [{ name: 'PM2.5', value: 35, unit: 'µg/m³' }] },
    { id: 'n24pgs', name: 'North 24 Parganas', state: 'West Bengal', aqi: 160, coordinates: { lat: 22.7230, lng: 88.4873 }, pollutants: [{ name: 'PM2.5', value: 85, unit: 'µg/m³' }] },
    { id: 's24pgs', name: 'South 24 Parganas', state: 'West Bengal', aqi: 130, coordinates: { lat: 22.1452, lng: 88.6692 }, pollutants: [{ name: 'PM2.5', value: 58, unit: 'µg/m³' }] },
    { id: 'medinipur_p', name: 'Paschim Medinipur', state: 'West Bengal', aqi: 95, coordinates: { lat: 22.4257, lng: 87.3199 }, pollutants: [{ name: 'PM2.5', value: 42, unit: 'µg/m³' }] },
    { id: 'medinipur_e', name: 'Purba Medinipur', state: 'West Bengal', aqi: 110, coordinates: { lat: 21.9830, lng: 87.8228 }, pollutants: [{ name: 'PM2.5', value: 48, unit: 'µg/m³' }] },
    { id: 'nadia', name: 'Nadia', state: 'West Bengal', aqi: 122, coordinates: { lat: 23.4734, lng: 88.5565 }, pollutants: [{ name: 'PM2.5', value: 52, unit: 'µg/m³' }] },
    { id: 'murshidabad', name: 'Murshidabad', state: 'West Bengal', aqi: 140, coordinates: { lat: 24.1352, lng: 88.2785 }, pollutants: [{ name: 'PM2.5', value: 62, unit: 'µg/m³' }] },
    { id: 'malda', name: 'Malda', state: 'West Bengal', aqi: 115, coordinates: { lat: 25.0081, lng: 88.1398 }, pollutants: [{ name: 'PM2.5', value: 50, unit: 'µg/m³' }] },
  ],
  'in-ka': [
    { id: 'bangalore', name: 'Bengaluru Urban', state: 'Karnataka', aqi: 55, coordinates: { lat: 12.9716, lng: 77.5946 }, pollutants: [{ name: 'PM2.5', value: 30, unit: 'µg/m³' }] },
    { id: 'mysuru', name: 'Mysuru', state: 'Karnataka', aqi: 38, coordinates: { lat: 12.2958, lng: 76.6394 }, pollutants: [{ name: 'PM2.5', value: 18, unit: 'µg/m³' }] },
    { id: 'mangaluru', name: 'Dakshina Kannada', state: 'Karnataka', aqi: 41, coordinates: { lat: 12.9141, lng: 74.8560 }, pollutants: [{ name: 'PM2.5', value: 20, unit: 'µg/m³' }] },
    { id: 'hubli', name: 'Dharwad', state: 'Karnataka', aqi: 48, coordinates: { lat: 15.3647, lng: 75.1240 }, pollutants: [{ name: 'PM2.5', value: 22, unit: 'µg/m³' }] },
    { id: 'belagavi', name: 'Belagavi', state: 'Karnataka', aqi: 42, coordinates: { lat: 15.8497, lng: 74.4977 }, pollutants: [{ name: 'PM2.5', value: 19, unit: 'µg/m³' }] },
  ],
  'in-mh': [
    { id: 'mumbai', name: 'Mumbai City', state: 'Maharashtra', aqi: 142, coordinates: { lat: 19.0760, lng: 72.8777 }, pollutants: [{ name: 'PM2.5', value: 65, unit: 'µg/m³' }] },
    { id: 'pune', name: 'Pune', state: 'Maharashtra', aqi: 112, coordinates: { lat: 18.5204, lng: 73.8567 }, pollutants: [{ name: 'PM2.5', value: 55, unit: 'µg/m³' }] },
    { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', aqi: 98, coordinates: { lat: 21.1458, lng: 79.0882 }, pollutants: [{ name: 'PM2.5', value: 45, unit: 'µg/m³' }] },
    { id: 'thane', name: 'Thane', state: 'Maharashtra', aqi: 135, coordinates: { lat: 19.2183, lng: 72.9781 }, pollutants: [{ name: 'PM2.5', value: 60, unit: 'µg/m³' }] },
    { id: 'nashik', name: 'Nashik', state: 'Maharashtra', aqi: 88, coordinates: { lat: 19.9975, lng: 73.7898 }, pollutants: [{ name: 'PM2.5', value: 40, unit: 'µg/m³' }] },
  ],
};

export const DEMO_DISTRICTS = [
  { id: 'aizawl', name: 'Aizawl', state: 'Mizoram', aqi: 22 },
  { id: 'mysore', name: 'Mysore', state: 'Karnataka', aqi: 45 },
  { id: 'bangalore', name: 'Bangalore', state: 'Karnataka', aqi: 55 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', aqi: 112 },
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', aqi: 142 },
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', aqi: 178 },
  { id: 'gurugram', name: 'Gurugram', state: 'Haryana', aqi: 290 },
  { id: 'delhi', name: 'Delhi', state: 'NCT', aqi: 345 },
];

export const DEMO_NATIONAL_STATS = {
  averageAQI: 112,
  averageChange: -5,
  highAlertStates: 4,
  newHighAlerts: 2,
  activeHotspots: 87,
  districtsAffected: 12,
};
