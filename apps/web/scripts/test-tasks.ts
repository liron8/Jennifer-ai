/**
 * Test Script: Create sample tasks in the database
 * Run with: npx tsx scripts/test-tasks.ts
 * 
 * Note: This script requires a valid session. Run it after logging in.
 */

const API_BASE = 'http://localhost:3000';

const sampleTasks = [
  {
    title: 'Review Q1 Budget Proposal',
    description: 'Analyze the quarterly budget and prepare recommendations for the executive team',
    status: 'todo',
    priority: 'high',
    category: 'Reports',
    due_date: '2026-01-25',
  },
  {
    title: 'Schedule team offsite meeting',
    description: 'Coordinate with all team members for the February planning retreat',
    status: 'in_progress',
    priority: 'medium',
    category: 'Events',
    due_date: '2026-01-22',
  },
  {
    title: 'Update travel policy document',
    description: 'Review and update the company travel policy with new guidelines',
    status: 'todo',
    priority: 'low',
    category: 'Admin',
    due_date: '2026-01-30',
  },
];

async function createTasks() {
  console.log('Creating test tasks...\n');

  for (const task of sampleTasks) {
    try {
      const response = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Created: "${task.title}"`);
        console.log(`   ID: ${result.data.id}`);
        console.log(`   Status: ${result.data.status}, Priority: ${result.data.priority}\n`);
      } else {
        console.log(`❌ Failed to create: "${task.title}"`);
        console.log(`   Error: ${result.error?.message || 'Unknown error'}\n`);
      }
    } catch (error) {
      console.log(`❌ Error creating: "${task.title}"`);
      console.log(`   ${error}\n`);
    }
  }

  // Fetch all tasks to verify
  console.log('\n--- Fetching all tasks ---\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/tasks?page_size=100`);
    const result = await response.json();

    if (response.ok) {
      console.log(`Total tasks in database: ${result.data.length}\n`);
      result.data.forEach((task: any, index: number) => {
        console.log(`${index + 1}. ${task.title}`);
        console.log(`   Status: ${task.status} | Priority: ${task.priority} | Category: ${task.category}`);
        console.log(`   Due: ${task.due_date || 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('Failed to fetch tasks:', result.error?.message);
    }
  } catch (error) {
    console.log('Error fetching tasks:', error);
  }
}

createTasks();
