import Joi from 'joi';

const createAssignmentSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  problem_statement: Joi.string().min(1).required(),
  due_at: Joi.date().iso().allow(null).optional(),
  order_index: Joi.number().integer().min(0).required(),
  is_active: Joi.boolean().default(true),
});

const updateAssignmentSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  problem_statement: Joi.string().min(1),
  due_at: Joi.date().iso().allow(null),
  order_index: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
}).min(1);

const createMaterialSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  file_type: Joi.string().valid('PPT', 'DOC', 'PDF', 'PNG', 'JPEG'),
  order_index: Joi.number().integer().min(0).required(),
  is_active: Joi.boolean().default(true),
});

const updateMaterialSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  file_type: Joi.string().valid('PPT', 'DOC', 'PDF', 'PNG', 'JPEG'),
  order_index: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
}).min(1);

const createQuizSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  order_index: Joi.number().integer().min(0).required(),
  is_active: Joi.boolean().default(true),
});

const updateQuizSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  order_index: Joi.number().integer().min(0),
  is_active: Joi.boolean(),
}).min(1);

const createQuizQuestionSchema = Joi.object({
  question_text: Joi.string().min(1).required(),
  explanation: Joi.string().allow('', null).optional(),
  order_index: Joi.number().integer().min(0).required(),
  options: Joi.array().items(
    Joi.object({
      option_text: Joi.string().min(1).max(255).required(),
      is_correct: Joi.boolean().required(),
      order_index: Joi.number().integer().min(0).required(),
    })
  ).min(2).required().custom((value, helpers) => {
    const correctCount = value.filter(opt => opt.is_correct === true).length;
    if (correctCount !== 1) {
      return helpers.message('Exactly one option must be marked as correct');
    }
    return value;
  }),
});

const gradeSubmissionSchema = Joi.object({
  score: Joi.number().integer().min(0).max(100).required(),
  feedback: Joi.string().allow('', null).optional(),
});

const submitQuizAnswersSchema = Joi.object({
  answers: Joi.array().items(
    Joi.object({
      question_id: Joi.string().uuid().required(),
      option_id: Joi.string().uuid().required(),
    })
  ).min(1).required(),
});

export {
  createAssignmentSchema,
  updateAssignmentSchema,
  createMaterialSchema,
  updateMaterialSchema,
  createQuizSchema,
  updateQuizSchema,
  createQuizQuestionSchema,
  gradeSubmissionSchema,
  submitQuizAnswersSchema,
};
