// ============================================
// IndianAQI — Interactive SVG Map Coordinates
// ============================================
// Scaled & stylized SVG paths for states of India
// and their district sub-maps (e.g. West Bengal, Maharashtra, Karnataka).

// Viewport: 0 0 600 650
export const STATE_PATHS = [
  { id: 'in-jk', name: 'Jammu & Kashmir & Ladakh', path: 'M 195 25 L 225 15 L 255 35 L 260 70 L 225 90 L 195 85 L 180 50 Z' },
  { id: 'in-hp', name: 'Himachal Pradesh', path: 'M 225 90 L 250 85 L 265 110 L 255 130 L 230 120 L 220 105 Z' },
  { id: 'in-pb', name: 'Punjab', path: 'M 190 100 L 220 95 L 230 120 L 210 145 L 185 135 L 180 115 Z' },
  { id: 'in-ut', name: 'Uttarakhand', path: 'M 255 130 L 270 120 L 290 145 L 275 170 L 250 160 Z' },
  { id: 'in-hr', name: 'Haryana', path: 'M 210 145 L 235 140 L 245 155 L 240 185 L 215 180 L 205 160 Z' },
  { id: 'in-dl', name: 'Delhi', path: 'M 235 165 A 8 8 0 1 1 235 166 Z' }, // Custom circle-ish path for Delhi representation
  { id: 'in-rj', name: 'Rajasthan', path: 'M 130 150 L 185 135 L 210 170 L 220 220 L 175 250 L 125 210 Z' },
  { id: 'in-up', name: 'Uttar Pradesh', path: 'M 245 170 L 295 155 L 350 205 L 360 255 L 310 265 L 255 215 Z' },
  { id: 'in-br', name: 'Bihar', path: 'M 355 205 L 420 215 L 425 250 L 360 250 Z' },
  { id: 'in-jh', name: 'Jharkhand', path: 'M 360 255 L 425 255 L 415 300 L 375 300 L 355 280 Z' },
  { id: 'in-wb', name: 'West Bengal', path: 'M 425 215 L 440 210 L 445 235 L 428 250 L 435 320 L 415 300 Z' },
  { id: 'in-sk', name: 'Sikkim', path: 'M 425 195 L 435 195 L 438 210 L 427 210 Z' },
  { id: 'in-gj', name: 'Gujarat', path: 'M 75 220 L 125 215 L 140 255 L 155 295 L 115 305 L 90 280 L 70 255 Z' },
  { id: 'in-mp', name: 'Madhya Pradesh', path: 'M 175 250 L 255 215 L 310 265 L 320 310 L 260 330 L 170 305 Z' },
  { id: 'in-mh', name: 'Maharashtra', path: 'M 155 295 L 260 330 L 285 350 L 265 410 L 210 410 L 165 375 L 145 330 Z' },
  { id: 'in-ct', name: 'Chhattisgarh', path: 'M 285 305 L 320 310 L 325 385 L 295 435 L 285 365 Z' },
  { id: 'in-or', name: 'Odisha', path: 'M 325 310 L 375 300 L 405 325 L 380 380 L 335 375 Z' },
  { id: 'in-ap', name: 'Andhra Pradesh', path: 'M 265 410 L 295 435 L 320 390 L 305 520 L 275 510 L 255 450 Z' },
  { id: 'in-tg', name: 'Telangana', path: 'M 255 380 L 295 380 L 305 435 L 255 440 Z' },
  { id: 'in-ka', name: 'Karnataka', path: 'M 210 410 L 255 450 L 275 510 L 260 560 L 225 540 L 205 470 Z' },
  { id: 'in-go', name: 'Goa', path: 'M 202 468 L 210 468 L 208 475 L 202 475 Z' },
  { id: 'in-kl', name: 'Kerala', path: 'M 225 540 L 245 550 L 240 610 L 225 605 Z' },
  { id: 'in-tn', name: 'Tamil Nadu', path: 'M 245 550 L 275 510 L 285 525 L 275 615 L 240 610 Z' },
  // Northeast States grouped for cleaner design rendering
  { id: 'in-as', name: 'Assam & NE States', path: 'M 445 235 L 485 220 L 515 240 L 510 275 L 465 290 L 450 255 Z' }
];

// Stylized sub-district maps for West Bengal, Maharashtra, and Karnataka
// Rendered when you drill down into a state. Viewport: 0 0 400 400
export const STATE_DISTRICTS_MAP = {
  'in-wb': {
    name: 'West Bengal',
    viewBox: '0 0 300 500',
    paths: [
      { id: 'darjeeling', name: 'Darjeeling', path: 'M 140 10 L 175 10 L 165 45 L 130 35 Z', center: { x: 152, y: 25 } },
      { id: 'malda', name: 'Malda', path: 'M 130 90 L 165 95 L 160 145 L 115 135 Z', center: { x: 142, y: 115 } },
      { id: 'murshidabad', name: 'Murshidabad', path: 'M 130 160 L 180 155 L 195 210 L 140 215 L 125 185 Z', center: { x: 157, y: 185 } },
      { id: 'nadia', name: 'Nadia', path: 'M 160 215 L 205 210 L 195 275 L 165 285 Z', center: { x: 181, y: 245 } },
      { id: 'n24pgs', name: 'North 24 Parganas', path: 'M 165 285 L 210 275 L 225 355 L 170 365 Z', center: { x: 192, y: 320 } },
      { id: 's24pgs', name: 'South 24 Parganas', path: 'M 170 365 L 225 355 L 220 455 L 145 445 L 150 395 Z', center: { x: 185, y: 405 } },
      { id: 'kolkata', name: 'Kolkata', path: 'M 162 345 A 12 12 0 1 1 162 346 Z', center: { x: 162, y: 345 } }, // Distinct circle for Kolkata
      { id: 'howrah', name: 'Howrah', path: 'M 125 315 L 160 320 L 155 350 L 120 345 Z', center: { x: 140, y: 332 } },
      { id: 'hooghly', name: 'Hooghly', path: 'M 115 255 L 160 265 L 160 315 L 120 315 Z', center: { x: 138, y: 285 } },
      { id: 'medinipur_p', name: 'Paschim Medinipur', path: 'M 50 310 L 115 310 L 105 385 L 45 375 Z', center: { x: 78, y: 345 } },
      { id: 'medinipur_e', name: 'Purba Medinipur', path: 'M 105 385 L 150 375 L 145 445 L 95 440 Z', center: { x: 123, y: 410 } }
    ]
  },
  'in-ka': {
    name: 'Karnataka',
    viewBox: '0 0 300 450',
    paths: [
      { id: 'belagavi', name: 'Belagavi', path: 'M 60 50 L 110 40 L 120 95 L 75 110 L 55 85 Z', center: { x: 84, y: 76 } },
      { id: 'hubli', name: 'Dharwad & Hubli', path: 'M 75 110 L 120 95 L 130 150 L 80 160 Z', center: { x: 101, y: 128 } },
      { id: 'mangaluru', name: 'Dakshina Kannada', path: 'M 65 240 L 105 235 L 95 305 L 55 295 Z', center: { x: 80, y: 268 } },
      { id: 'mysuru', name: 'Mysuru', path: 'M 110 320 L 165 310 L 155 375 L 95 365 L 95 330 Z', center: { x: 127, y: 342 } },
      { id: 'bangalore', name: 'Bengaluru Urban', path: 'M 165 310 L 210 295 L 220 355 L 175 365 Z', center: { x: 192, y: 331 } }
    ]
  },
  'in-mh': {
    name: 'Maharashtra',
    viewBox: '0 0 450 350',
    paths: [
      { id: 'mumbai', name: 'Mumbai City', path: 'M 35 125 A 14 14 0 1 1 35 126 Z', center: { x: 35, y: 125 } },
      { id: 'thane', name: 'Thane', path: 'M 30 75 L 85 70 L 95 130 L 45 145 Z', center: { x: 63, y: 105 } },
      { id: 'pune', name: 'Pune', path: 'M 85 135 L 155 125 L 165 195 L 95 210 Z', center: { x: 125, y: 166 } },
      { id: 'nashik', name: 'Nashik', path: 'M 85 20 L 155 35 L 145 105 L 75 100 Z', center: { x: 115, y: 65 } },
      { id: 'nagpur', name: 'Nagpur', path: 'M 330 35 L 390 40 L 385 110 L 325 100 Z', center: { x: 357, y: 71 } }
    ]
  },
  'in-dl': {
    name: 'Delhi',
    viewBox: '0 0 400 400',
    paths: [
      { id: 'delhi-n', name: 'North Delhi', path: 'M 100 50 L 200 50 L 200 120 L 150 150 L 100 120 Z', center: { x: 150, y: 85 } },
      { id: 'delhi-w', name: 'West Delhi', path: 'M 50 120 L 100 120 L 150 150 L 120 220 L 50 200 Z', center: { x: 95, y: 160 } },
      { id: 'delhi-c', name: 'New Delhi Central', path: 'M 100 120 L 150 150 L 200 120 L 250 150 L 220 220 L 150 200 Z', center: { x: 170, y: 165 } },
      { id: 'delhi-e', name: 'East Delhi', path: 'M 200 120 L 300 100 L 300 200 L 250 220 L 250 150 Z', center: { x: 260, y: 150 } },
      { id: 'delhi-s', name: 'South Delhi', path: 'M 120 220 L 150 200 L 220 220 L 250 300 L 150 320 L 100 280 Z', center: { x: 170, y: 260 } }
    ]
  },
  'in-up': {
    name: 'Uttar Pradesh',
    viewBox: '0 0 450 350',
    paths: [
      { id: 'up-noid', name: 'Noida', path: 'M 50 50 L 150 40 L 170 120 L 50 140 Z', center: { x: 100, y: 90 } },
      { id: 'up-knp', name: 'Kanpur', path: 'M 150 40 L 280 60 L 260 180 L 170 120 Z', center: { x: 215, y: 110 } },
      { id: 'up-lko', name: 'Lucknow', path: 'M 280 60 L 380 80 L 350 220 L 260 180 Z', center: { x: 320, y: 140 } }
    ]
  },
  'in-br': {
    name: 'Bihar',
    viewBox: '0 0 450 350',
    paths: [
      { id: 'br-pat', name: 'Patna', path: 'M 50 50 L 180 50 L 150 150 L 50 120 Z', center: { x: 110, y: 90 } },
      { id: 'br-gay', name: 'Gaya', path: 'M 180 50 L 320 70 L 280 180 L 150 150 Z', center: { x: 230, y: 110 } },
      { id: 'br-muz', name: 'Muzaffarpur', path: 'M 150 150 L 280 180 L 250 260 L 100 240 Z', center: { x: 190, y: 200 } }
    ]
  },
  'in-rj': {
    name: 'Rajasthan',
    viewBox: '0 0 450 350',
    paths: [
      { id: 'rj-jpr', name: 'Jaipur', path: 'M 50 50 L 200 50 L 180 180 L 50 150 Z', center: { x: 120, y: 110 } },
      { id: 'rj-jdp', name: 'Jodhpur', path: 'M 200 50 L 350 70 L 300 200 L 180 180 Z', center: { x: 260, y: 125 } },
      { id: 'rj-udp', name: 'Udaipur', path: 'M 180 180 L 300 200 L 250 300 L 100 280 Z', center: { x: 210, y: 240 } }
    ]
  },
  'in-gj': {
    name: 'Gujarat',
    viewBox: '0 0 450 350',
    paths: [
      { id: 'gj-ahd', name: 'Ahmedabad', path: 'M 50 50 L 180 60 L 160 160 L 50 140 Z', center: { x: 110, y: 100 } },
      { id: 'gj-srt', name: 'Surat', path: 'M 180 60 L 320 80 L 280 200 L 160 160 Z', center: { x: 230, y: 125 } },
      { id: 'gj-vad', name: 'Vadodara', path: 'M 160 160 L 280 200 L 230 290 L 100 270 Z', center: { x: 190, y: 230 } }
    ]
  },
  'in-tn': {
    name: 'Tamil Nadu',
    viewBox: '0 0 450 350',
    paths: [
      { id: 'tn-chn', name: 'Chennai', path: 'M 50 50 L 180 50 L 150 150 L 50 120 Z', center: { x: 110, y: 90 } },
      { id: 'tn-cbe', name: 'Coimbatore', path: 'M 180 50 L 320 70 L 280 180 L 150 150 Z', center: { x: 230, y: 110 } },
      { id: 'tn-mdu', name: 'Madurai', path: 'M 150 150 L 280 180 L 250 280 L 100 250 Z', center: { x: 190, y: 210 } }
    ]
  }
};
