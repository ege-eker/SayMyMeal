import { FastifyReply, FastifyRequest } from "fastify";
import { optionService } from "./option.service";
import { CreateOptionInput, AddChoiceInput } from "./option.types";

export const optionController = (app: any) => {
  const service = optionService(app);

  return {
    // OPTION GROUP CREATE
    createOption: async (
      req: FastifyRequest<{ Body: CreateOptionInput }>,
      reply: FastifyReply
    ) => {
      const option = await service.createOption(req.body);
      reply.code(201).send(option);
    },

    // ADD CHOICE TO AN OPTION
    addChoice: async (
      req: FastifyRequest<{ Body: AddChoiceInput }>,
      reply: FastifyReply
    ) => {
      const choice = await service.addChoice(req.body);
      reply.code(201).send(choice);
    },

    // GET ALL OPTIONS FOR A SPECIFIC FOOD
    getOptionsByFood: async (
      req: FastifyRequest<{ Params: { foodId: string } }>,
      reply: FastifyReply
    ) => {
      const options = await service.findByFood(req.params.foodId);
      reply.send(options);
    },

    // REMOVE ONE OPTION
    removeOption: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      await service.removeOption(req.params.id);
      reply.code(204).send();
    },
  };
};