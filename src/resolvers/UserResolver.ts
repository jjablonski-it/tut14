import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { compare, hash } from "bcrypt";
import User from "../entities/User";

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

@ObjectType()
class Error {
  @Field()
  field: String;

  @Field()
  message: String;
}

@ObjectType()
class UserResponse {
  @Field(() => Error, { nullable: true })
  error?: Error;

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export default class UserResolver {
  @Query(() => UserResponse, { nullable: true })
  async login(
    @Arg("input") { username, password }: UsernamePasswordInput
  ): Promise<UserResponse> {
    const user = await User.findOne({ username });
    if (!user)
      return {
        error: { field: "username", message: "user not found" },
      };

    const valid = await compare(password, user.password);
    if (!valid)
      return {
        error: { field: "password", message: "wrong password" },
      };

    return { user };
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("input") { username, password }: UsernamePasswordInput
  ): Promise<UserResponse> {
    const hashedPassword = await hash(password, 10);
    const user = new User();
    user.username = username;
    user.password = hashedPassword;
    await user.save();
    return { user };
  }
}
