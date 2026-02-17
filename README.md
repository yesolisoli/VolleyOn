# Community Web App

🚧 This project is currently under development.

A community-based web application built with Next.js and Supabase.  
This project focuses on user authentication, profile management, and secure data access using Row Level Security.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, PostgreSQL, RLS)
- Vercel

## Features

- Email and password authentication
- User profile system linked to Supabase Auth
- Row Level Security for user data protection
- Clean and scalable project structure

## Database

- `auth.users` for authentication
- `profiles` table for application user data
- RLS enabled with `auth.uid()` based access control

## Future Improvements

- OAuth providers (Google, GitHub)
- Role-based access control
- Post and comment features
- Environment separation for production
