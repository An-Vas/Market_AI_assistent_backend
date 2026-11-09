import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../dbconfig';

export class CategoryThreshold extends Model {
  public id!: number;
  public category!: string;
  public intent!: string;
  public confidenceThreshold!: number;
  public readonly createdAt!: Date;
}

CategoryThreshold.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    intent: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    confidenceThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      field: 'confidence_threshold',
    },
  },
  {
    sequelize,
    tableName: 'category_confidence_thresholds',
    createdAt: 'created_at',
    updatedAt: false,
  },
);
