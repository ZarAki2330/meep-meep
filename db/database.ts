// db/database.ts
// Ouverture unique de la base locale + création des tables.

import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("meepmeep.db").then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS parties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          jeu_id TEXT,
          jeu_nom TEXT,
          date TEXT,
          nb_joueurs INTEGER,
          gagnant TEXT,
          score_gagnant INTEGER,
          details TEXT
        );
        CREATE TABLE IF NOT EXISTS joueurs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nom TEXT UNIQUE
        );
        CREATE TABLE IF NOT EXISTS jeux (
          id TEXT PRIMARY KEY,
          nom TEXT,
          description TEXT,
          joueurs_min INTEGER,
          joueurs_max INTEGER,
          duree_min INTEGER,
          age_min INTEGER,
          categorie TEXT,
          image TEXT,
          regles TEXT,
          score_victoire TEXT,
          seuil_fin INTEGER,
          score_mode TEXT
        );
        CREATE TABLE IF NOT EXISTS favoris (
          jeu_id TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS partie_en_cours (
          jeu_id TEXT PRIMARY KEY,
          date TEXT,
          etat TEXT
        );
      `);

      // Migrations : ajout des colonnes si la base existait déjà.
      for (const colonne of ["categories TEXT", "bonus TEXT"]) {
        try {
          await db.execAsync(`ALTER TABLE jeux ADD COLUMN ${colonne};`);
        } catch {
          // la colonne existe déjà
        }
      }

      return db;
    });
  }
  return dbPromise;
}
