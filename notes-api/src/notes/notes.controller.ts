import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './note.entity';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(): Promise<Note[]> {
    return this.notes.list();
  }

  // The id column is a uuid, so anything else is rejected before it reaches PostgreSQL.
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Note> {
    return this.notes.get(id);
  }

  @Post()
  create(@Body() dto: CreateNoteDto): Promise<Note> {
    return this.notes.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<Note> {
    return this.notes.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.notes.remove(id);
  }
}
