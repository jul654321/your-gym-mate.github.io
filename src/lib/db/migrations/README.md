# Database Migrations

This directory contains database migration files for Your Gym Mate IndexedDB schema.

## Migration Strategy

- Each migration is versioned and corresponds to a database version number
- Migrations should be **idempotent** (safe to run multiple times)
- Migrations should be **deterministic** (same result every time)
- Large migrations should be batched to avoid blocking the UI

## Adding a New Migration

1. Increment `DB_VERSION` in `src/lib/db/index.ts`
2. Add the migration function to `migrations/index.ts`
3. Test the migration thoroughly with existing data

## Migration Best Practices

### DO:
- Keep migrations small and focused
- Test with realistic data volumes
- Use batch processing for large datasets (100-500 records per batch)
- Log migration progress for debugging
- Make migrations resumable if they can be interrupted

### DON'T:
- Modify migration code after it's deployed
- Delete old migration code
- Block the main thread for long operations
- Assume data structure without validation

## Example Migration

```typescript
// Migration v2: Add exerciseIds to plans
2: async (db) => {
  const tx = db.transaction('plans', 'readwrite');
  const store = tx.objectStore('plans');
  const plans = await store.getAll();
  
  // Batch processing
  const batchSize = 100;
  for (let i = 0; i < plans.length; i += batchSize) {
    const batch = plans.slice(i, i + batchSize);
    
    for (const plan of batch) {
      if (!plan.exerciseIds) {
        plan.exerciseIds = plan.planExercises.map(pe => pe.exerciseId);
        await store.put(plan);
      }
    }
    
    // Yield to prevent blocking
    if (i + batchSize < plans.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  await tx.done;
  console.log('[Migration v2] Updated', plans.length, 'plans');
},
```

## Testing Migrations

Before deploying a migration:

1. Export production data (if available)
2. Test migration on exported data
3. Verify data integrity after migration
4. Check performance with realistic data volumes
5. Test rollback strategy (if applicable)
