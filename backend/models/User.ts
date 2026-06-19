import mongoose, { Schema } from "mongoose";

const LoginHistorySchema = new Schema({
  date: { type: Date, default: Date.now },
  ipAddress: { type: String, default: "127.0.0.1" },
  device: { type: String, default: "Generic Web Device" },
  location: { type: String, default: "System Portal Authentication" }
});

const ActivityHistorySchema = new Schema({
  date: { type: String, required: true },
  solvedCount: { type: Number, default: 0 }
});

const UserStatsSchema = new Schema({
  rating: { type: Number, default: 1000 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  streak: { type: Number, default: 1 },
  typingWpm: { type: Number, default: 45 },
  accuracy: { type: Number, default: 100 },
  solvedEasy: { type: Number, default: 0 },
  solvedMedium: { type: Number, default: 0 },
  solvedHard: { type: Number, default: 0 },
  activityHistory: [ActivityHistorySchema]
});

const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isBanned: { type: Boolean, default: false },
    name: { type: String },
    bio: { type: String, default: "Crafting code in Clash Arena." },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    profileImage: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    hackerStreak: { type: Number, default: 1 },
    typingSpeed: { type: Number, default: 45 },
    solvedProblems: { type: Number, default: 0 },
    rank: { type: Number, default: 1000 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    onlineStatus: { type: Boolean, default: false },
    online: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
    lastActiveAt: { type: String, default: () => new Date().toISOString() },
    stats: { type: UserStatsSchema, default: () => ({}) },
    loginHistory: [LoginHistorySchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

UserSchema.virtual("actualAvatar").get(function() {
  return this.avatarUrl || this.profileImage;
});

UserSchema.pre("save", async function(this: any) {
  if (this.isModified("online") || this.isModified("onlineStatus")) {
    if (this.online) {
      this.onlineStatus = true;
    } else if (this.onlineStatus) {
      this.online = true;
    }
  }

  if (this.isModified("stats")) {
    this.hackerStreak = this.stats.streak;
    this.typingSpeed = this.stats.typingWpm;
    this.solvedProblems = this.stats.solvedEasy + this.stats.solvedMedium + this.stats.solvedHard;
    this.rank = this.stats.rating;
    this.wins = this.stats.wins;
    this.losses = this.stats.losses;
    this.draws = this.stats.draws;
  }

  if (this.isModified("lastActiveAt")) {
    this.lastActive = new Date(this.lastActiveAt);
  } else if (this.isModified("lastActive")) {
    this.lastActiveAt = this.lastActive.toISOString();
  }
});

export const UserModel: mongoose.Model<any> = mongoose.models.User || mongoose.model("User", UserSchema);