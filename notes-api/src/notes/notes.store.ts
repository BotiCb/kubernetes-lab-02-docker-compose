import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Note } from './note.entity';

interface NoteRow {
  id: string;
  title: string;
  body: string;
  created_at: Date;
  updated_at: Date;
}

const toNote = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  body: row.body,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

/** Persists the notes in the PostgreSQL `notes` table. */
@Injectable()
export class NotesStore {
  constructor(private readonly db: DatabaseService) {}

  async all(): Promise<Note[]> {
    const { rows } = await this.db.query<NoteRow>(
      'SELECT * FROM notes ORDER BY created_at DESC',
    );
    return rows.map(toNote);
  }

  async find(id: string): Promise<Note | undefined> {
    const { rows } = await this.db.query<NoteRow>(
      'SELECT * FROM notes WHERE id = $1',
      [id],
    );
    return rows[0] && toNote(rows[0]);
  }

  async save(note: Note): Promise<Note> {
    const { rows } = await this.db.query<NoteRow>(
      `INSERT INTO notes (id, title, body, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title,
             body = EXCLUDED.body,
             updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [note.id, note.title, note.body, note.createdAt, note.updatedAt],
    );
    return toNote(rows[0]);
  }

  async remove(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM notes WHERE id = $1', [
      id,
    ]);
    return (rowCount ?? 0) > 0;
  }
}
