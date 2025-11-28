// Debug extraction methods manually
// Based on the source code analysis

// extractSectionNumber logic
function extractSectionNumber(section) {
  // Try different ways to extract section numbers
  const patterns = [
    /^(\d+(?:\.\d+)*)/, // Number at start
    /Section\s+(\d+(?:\.\d+)*)/i,
    /Sect\.?\s+(\d+(?:\.\d+)*)/i,
  ];

  for (const pattern of patterns) {
    const match =
      section.label.match(pattern) || section.content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Check metadata
  if (section.metadata?.properties?.sectionNumber) {
    return String(section.metadata.properties.sectionNumber);
  }

  return null;
}

// extractFigureNumber logic
function extractFigureNumber(figure) {
  const patterns = [
    /Figure?\s+(\d+(?:\.\d+)*)/i,
    /Fig\.?\s+(\d+(?:\.\d+)*)/i,
    /^(\d+(?:\.\d+)*)/,
  ];

  for (const pattern of patterns) {
    const match =
      figure.label.match(pattern) || figure.content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Check metadata
  if (figure.metadata?.properties?.figureNumber) {
    return String(figure.metadata.properties.figureNumber);
  }

  return null;
}

// extractTableNumber logic
function extractTableNumber(table) {
  const patterns = [
    /Table?\s+(\d+(?:\.\d+)*)/i,
    /Tab\.?\s+(\d+(?:\.\d+)*)/i,
    /^(\d+(?:\.\d+)*)/,
  ];

  for (const pattern of patterns) {
    const match = table.label.match(pattern) || table.content.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Check metadata
  if (table.metadata?.properties?.tableNumber) {
    return String(table.metadata.properties.tableNumber);
  }

  return null;
}

// Mock nodes (based on test setup) - let's check what the actual metadata looks like
const sectionNode = {
  id: 'section-1',
  type: 'section',
  label: 'Section: Results',
  content: 'Results',
  position: { page: 3, start: 0, end: 7 },
  metadata: {
    confidence: 0.9,
    properties: {
      level: 3,
      headingLevel: 3,
      sectionNumber: '3.2'
    }
  },
  created_at: new Date(),
  updated_at: new Date()
};

// Also test with the metadata structure from the test debug output
const sectionNodeFromTest = {
  id: 'section-1',
  type: 'section',
  label: 'Section: Results',
  content: 'Results',
  position: { page: 3, start: 0, end: 7 },
  metadata: { sectionNumber: '3.2' }, // This is what we saw in the test debug
  created_at: new Date(),
  updated_at: new Date()
};

const figureNode = {
  id: 'figure-1',
  type: 'image',
  label: 'Image: Figure 1',
  content: 'Figure 1',
  position: { page: 4, start: 0, end: 8 },
  metadata: {
    confidence: 0.6,
    properties: {
      dimensions: { width: 100, height: 100 },
      hasAltText: true
    }
  },
  created_at: new Date(),
  updated_at: new Date()
};

const tableNode = {
  id: 'table-1',
  type: 'table',
  label: 'Table: 3x4',
  content: 'Sample Table',
  position: { page: 6, start: 0, end: 12 },
  metadata: {
    confidence: 0.7,
    properties: {
      rowCount: 3,
      colCount: 4,
      cellCount: 12
    }
  },
  created_at: new Date(),
  updated_at: new Date()
};

console.log('=== Section Node (Factory structure) ===');
console.log('Label:', sectionNode.label);
console.log('Content:', sectionNode.content);
console.log('Full metadata:', JSON.stringify(sectionNode.metadata, null, 2));
console.log('extractSectionNumber result:', extractSectionNumber(sectionNode));

console.log('\n=== Section Node (Test debug structure) ===');
console.log('Label:', sectionNodeFromTest.label);
console.log('Content:', sectionNodeFromTest.content);
console.log('Full metadata:', JSON.stringify(sectionNodeFromTest.metadata, null, 2));
console.log('extractSectionNumber result:', extractSectionNumber(sectionNodeFromTest));

console.log('\n=== Figure Node ===');
console.log('Label:', figureNode.label);
console.log('Content:', figureNode.content);
console.log('extractFigureNumber result:', extractFigureNumber(figureNode));

console.log('\n=== Table Node ===');
console.log('Label:', tableNode.label);
console.log('Content:', tableNode.content);
console.log('extractTableNumber result:', extractTableNumber(tableNode));
