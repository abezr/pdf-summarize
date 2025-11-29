exports.up = (pgm) => {
  pgm.createTable('documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'varchar(255)', notNull: false },
    filename: { type: 'varchar(255)', notNull: true },
    file_size: { type: 'integer', notNull: true },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'processing', 'completed', 'failed')"
    },
    pdf_url: { type: 'text', notNull: false },
    graph_data: { type: 'jsonb', notNull: false },
    summary: { type: 'text', notNull: false },
    metadata: { type: 'jsonb', notNull: false, default: '{}' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('documents', 'status');
  pgm.createIndex('documents', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('documents');
};
