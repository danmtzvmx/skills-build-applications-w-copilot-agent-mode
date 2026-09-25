import { Router } from 'express';
import { Activity, Leaderboard, Team, User, Workout } from './models.js';

const apiRouter = Router();

apiRouter.get('/users/', async (_req, res) => {
  res.json(await User.find().select('-password').lean());
});

apiRouter.get('/teams/', async (_req, res) => {
  res.json(await Team.find().populate('members', '-password').lean());
});

apiRouter.get('/activities/', async (_req, res) => {
  res.json(await Activity.find().populate('user', 'username name').lean());
});

apiRouter.get('/leaderboard/', async (_req, res) => {
  res.json(
    await Leaderboard.find()
      .sort({ score: -1 })
      .populate('user', 'username name')
      .lean(),
  );
});

apiRouter.get('/workouts/', async (_req, res) => {
  res.json(await Workout.find().lean());
});

export default apiRouter;
