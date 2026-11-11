// src/components/ai/NaturalQueryChat.tsx
'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  User,
  Table as TableIcon,
  FileCheck,
  HelpCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  type?: 'TABLE' | 'SUMMARY' | 'ALERT' | 'LIST';
  data?: any;
  suggestions?: string[];
  timestamp: string;
}

export default function NaturalQueryChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      content:
        '¡Hola! Soy el **Asistente Inteligente de preceptor-ia**. Puedes consultarme en lenguaje natural sobre alumnos matriculados, documentación médica faltante (ISA / CUS), teléfonos de contacto de tutores para urgencias o el estado de firma de los documentos.',
      type: 'SUMMARY',
      suggestions: [
        '¿Quiénes tienen documentación pendiente de firma?',
        'Buscar alumno Fernández',
        'Listado de cursos y matrículas',
        'Resumen general del colegio',
      ],
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: json.data.answer,
          type: json.data.type,
          data: json.data.data,
          suggestions: json.data.suggestions,
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, botMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          content: `Ocurrió un inconveniente al consultar la base de datos: ${err.message}`,
          timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Asistente de Preceptoría</span>
            <Badge variant="warning" className="gap-1 text-xs">
              <Sparkles className="w-3 h-3" /> IA Fase 2
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consultas semánticas y operativas sobre los legajos, cursos y alertas médicas del IPETYM Nº 256.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setMessages([
              {
                id: 'welcome',
                sender: 'bot',
                content:
                  'Conversación reiniciada. ¿Qué consulta deseas realizar sobre las matrículas o legajos?',
                type: 'SUMMARY',
                suggestions: [
                  '¿Quiénes tienen documentación pendiente de firma?',
                  'Buscar alumno Fernández',
                  'Listado de cursos y matrículas',
                ],
                timestamp: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Nueva Consulta</span>
        </Button>
      </div>

      {/* Card de Conversación */}
      <Card className="shadow-md flex flex-col min-h-[500px] max-h-[70vh]">
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isBot = m.sender === 'bot';

            return (
              <div
                key={m.id}
                className={cn('flex items-start gap-3', isBot ? 'justify-start' : 'justify-end')}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-3 text-sm transition-all',
                    isBot
                      ? 'bg-muted/70 text-foreground border shadow-2xs'
                      : 'bg-primary text-primary-foreground font-medium shadow-xs'
                  )}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                  {/* Renderizado de Tabla si la respuesta contiene datos tabulares */}
                  {isBot && m.type === 'TABLE' && Array.isArray(m.data) && m.data.length > 0 && (
                    <div className="rounded-xl border bg-background overflow-hidden my-2">
                      <div className="overflow-x-auto max-h-60">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">DNI</TableHead>
                              <TableHead className="text-xs">Estudiante</TableHead>
                              <TableHead className="text-xs">Curso</TableHead>
                              <TableHead className="text-xs">Documento</TableHead>
                              <TableHead className="text-xs">Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.data.map((row: any, idx: number) => (
                              <TableRow key={idx} className="text-xs">
                                <TableCell className="font-mono">{row.dni}</TableCell>
                                <TableCell className="font-semibold">{row.estudiante}</TableCell>
                                <TableCell>{row.curso}</TableCell>
                                <TableCell>{row.documento}</TableCell>
                                <TableCell>
                                  <Badge variant="warning" className="text-[10px]">
                                    {row.estadoFirma}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Renderizado de Lista de Cursos */}
                  {isBot && m.type === 'LIST' && Array.isArray(m.data) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                      {m.data.map((c: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-background border text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span>{c.curso} ({c.turno})</span>
                            <Badge variant="secondary">{c.matriculados} alumnos</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sugerencias de continuación */}
                  {isBot && m.suggestions && m.suggestions.length > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground">Preguntas sugeridas:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {m.suggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => sendMessage(sug)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-background hover:bg-accent border text-foreground transition-colors"
                          >
                            <span>{sug}</span>
                            <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      'text-[10px] text-right',
                      isBot ? 'text-muted-foreground' : 'text-primary-foreground/75'
                    )}
                  >
                    {m.timestamp}
                  </div>
                </div>

                {!isBot && (
                  <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-muted/60 border text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Analizando registros y legajos...</span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-3 sm:p-4 border-t bg-muted/20">
          <div className="flex items-center gap-2 w-full">
            <Input
              type="text"
              placeholder="Escribe tu consulta (Ej: ¿Qué alumnos deben CUS? o Buscar DNI 48921345)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              variant="brand"
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
