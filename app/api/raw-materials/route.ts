import { NextResponse } from 'next/server';

// Sample data - replace with actual database integration
let rawMaterials = [
  {
    id: 1,
    name: 'Cotton Fabric',
    print: 'Floral',
    unit: 'Meters',
    price: 150.00,
    stock: 1000,
    type: 'Fabric'
  },
  {
    id: 2,
    name: 'Polyester Thread',
    print: 'Solid',
    unit: 'Spools',
    price: 25.00,
    stock: 500,
    type: 'Thread'
  },
  {
    id: 3,
    name: 'Silk',
    print: 'Plain',
    unit: 'Meters',
    price: 300.00,
    stock: 200,
    type: 'Fabric'
  }
];

export async function GET() {
  try {
    return NextResponse.json(rawMaterials);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch raw materials' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const newMaterial = await request.json();
    newMaterial.id = rawMaterials.length + 1;
    rawMaterials.push(newMaterial);
    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create raw material' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const updatedMaterial = await request.json();
    const index = rawMaterials.findIndex(
      (material) => material.id === updatedMaterial.id
    );
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Raw material not found' },
        { status: 404 }
      );
    }

    rawMaterials[index] = updatedMaterial;
    return NextResponse.json(updatedMaterial);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update raw material' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',').map(Number);

    if (!ids) {
      return NextResponse.json(
        { error: 'No IDs provided' },
        { status: 400 }
      );
    }

    rawMaterials = rawMaterials.filter((material) => !ids.includes(material.id));
    return NextResponse.json({ message: 'Raw materials deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete raw materials' },
      { status: 500 }
    );
  }
} 