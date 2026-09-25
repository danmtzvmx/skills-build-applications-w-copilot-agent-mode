import mongoose from 'mongoose';
import { randomBytes, scryptSync } from 'node:crypto';
import { Activity, Leaderboard, Team, User, Workout } from '../models.js';

const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/octofit_db';

const teams = ['Trailblazers', 'Pulse Squad'];

const users = [
  { username: 'ava.rivera', name: 'Ava Rivera', email: 'ava.rivera@example.com', team: teams[0] },
  { username: 'liam.chen', name: 'Liam Chen', email: 'liam.chen@example.com', team: teams[0] },
  { username: 'maya.patel', name: 'Maya Patel', email: 'maya.patel@example.com', team: teams[1] },
  { username: 'noah.johnson', name: 'Noah Johnson', email: 'noah.johnson@example.com', team: teams[1] },
];

const activities = [
  { username: 'ava.rivera', type: 'run', duration: 32, distance: 5, points: 50, date: '2026-09-01' },
  { username: 'ava.rivera', type: 'cycling', duration: 45, distance: 15, points: 45, date: '2026-09-03' },
  { username: 'liam.chen', type: 'run', duration: 28, distance: 4, points: 40, date: '2026-09-02' },
  { username: 'liam.chen', type: 'strength', duration: 40, points: 35, date: '2026-09-04' },
  { username: 'maya.patel', type: 'run', duration: 35, distance: 5.5, points: 55, date: '2026-09-01' },
  { username: 'maya.patel', type: 'yoga', duration: 30, points: 30, date: '2026-09-05' },
  { username: 'noah.johnson', type: 'cycling', duration: 60, distance: 20, points: 60, date: '2026-09-02' },
  { username: 'noah.johnson', type: 'strength', duration: 35, points: 32, date: '2026-09-06' },
];

const workouts = [
  { name: 'Foundation Run', description: 'A steady-paced run to build aerobic endurance.', category: 'Cardio', difficulty: 'Beginner', duration: 30 },
  { name: 'Full-Body Strength', description: 'A balanced strength session using bodyweight movements.', category: 'Strength', difficulty: 'Intermediate', duration: 40 },
  { name: 'Recovery Flow', description: 'Gentle mobility and yoga for active recovery.', category: 'Flexibility', difficulty: 'Beginner', duration: 25 },
  { name: 'Cycling Intervals', description: 'Alternating hard and easy efforts to build cycling fitness.', category: 'Cardio', difficulty: 'Advanced', duration: 45 },
];

function makeUnusableSeedPassword(): string {
  const salt = randomBytes(16);
  const hash = scryptSync(randomBytes(32), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function seedDatabase(): Promise<void> {
  try {
    await mongoose.connect(connectionString);
    console.log('Connected to octofit_db');

    const teamIds = new Map<string, mongoose.Types.ObjectId>();
    for (const name of teams) {
      const team = await Team.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, members: [] } },
        { upsert: true, returnDocument: 'after', runValidators: true },
      );
      teamIds.set(name, team._id);
    }

    const userIds = new Map<string, mongoose.Types.ObjectId>();
    for (const user of users) {
      const teamId = teamIds.get(user.team);
      if (!teamId) {
        throw new Error(`Missing seeded team "${user.team}" for ${user.username}`);
      }

      const savedUser = await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: { username: user.username, name: user.name, team: teamId },
          $setOnInsert: { email: user.email, password: makeUnusableSeedPassword() },
        },
        { upsert: true, returnDocument: 'after', runValidators: true },
      );
      userIds.set(user.username, savedUser._id);
    }

    for (const teamName of teams) {
      const members = users
        .filter((user) => user.team === teamName)
        .map((user) => userIds.get(user.username))
        .filter((userId): userId is mongoose.Types.ObjectId => userId !== undefined);
      await Team.updateOne({ name: teamName }, { $set: { members } }, { runValidators: true });
    }

    const scores = new Map(users.map((user) => [user.username, 0]));
    for (const activity of activities) {
      const userId = userIds.get(activity.username);
      if (!userId) {
        throw new Error(`Missing seeded user "${activity.username}" for activity`);
      }

      const date = new Date(`${activity.date}T12:00:00.000Z`);
      await Activity.findOneAndUpdate(
        { user: userId, type: activity.type, date },
        {
          $set: {
            duration: activity.duration,
            distance: activity.distance,
            points: activity.points,
            date,
          },
          $setOnInsert: { user: userId, type: activity.type },
        },
        { upsert: true, returnDocument: 'after', runValidators: true },
      );
      scores.set(activity.username, (scores.get(activity.username) ?? 0) + activity.points);
    }

    const rankings = [...scores.entries()].sort((left, right) => right[1] - left[1]);
    for (const [index, [username, score]] of rankings.entries()) {
      const userId = userIds.get(username);
      if (!userId) {
        throw new Error(`Missing seeded user "${username}" for leaderboard`);
      }
      await Leaderboard.findOneAndUpdate(
        { user: userId },
        { $set: { score, rank: index + 1 }, $setOnInsert: { user: userId } },
        { upsert: true, returnDocument: 'after', runValidators: true },
      );
    }

    for (const workout of workouts) {
      await Workout.findOneAndUpdate(
        { name: workout.name },
        { $set: workout },
        { upsert: true, returnDocument: 'after', runValidators: true },
      );
    }

    console.log('Database seeding complete');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

seedDatabase();
